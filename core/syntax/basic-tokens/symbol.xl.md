# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { Branch } from "../branch.xl.md"
import { BranchConditionResult } from "../branch-condition-result.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ReloadMessage } from "../messages/reload-message.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { Common } from "./common.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

符号块：`=`、`;`、`"`、`,`、`=>`、`+=` 这些标点。它与 `Common` 的分工是**按字符分类**，不是按语义——`Common` 吃标识符与数字、并明确拒绝符号与空白，剩下的标点全归这里。

它比 `Common` 多一层判断：`Temp` 里的内容加上当前字符如果构成 `+=` / `??` / `=>` 这类组合符号，就继续吞；否则断开重开。

`{` `(` `[` 不归它：那三个开括号由 `Bracket` 认领，且 `Bracket` 排在它前面。

`SymbolBranch` 写在 `Symbol` **之前**：`Symbol.AppendIn` 这个静态字段会在类定义时立即 `new SymbolBranch()`，写反了会命中 ts 的暂时性死区。

# class SymbolBranch extends Branch

符号块的跳转规则：判断当前字符是开一个新的 `Symbol`、追加到上一个，还是根本不归自己。

判定顺序：不是符号就失败；上一个也是 `Symbol` 时按它已关闭 / 能续接分两种 `Message`；`.` 跟在纯数字 `Common` 后面时让给 `Common`（小数点归它吃）；其余开新块。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判断要不要接手当前字符，以及是「新增」（`Message = 0`）还是「追加」（`Message = 1`）。

`unit` 是宿主单元：它不一定就是上一个 `Symbol` 的父单元，所以这里统一走 `unit.Last()`。

```ts
const value = source.Value;
if (!unit.Template.SymbolTemplate.IsSymbol(value)) {
  const result = new BranchConditionResult();
  result.Success = false;
  return result;
}
const last = unit.Last();
if (last instanceof Symbol) {
  if (last.Closed) {
    const result = new BranchConditionResult();
    result.Success = true;
    result.Message = 0;
    return result;
  }
  const result = new BranchConditionResult();
  result.Success = true;
  result.Message = last.IsAppend(source) ? 1 : 0;
  return result;
}
if (value === "." && last instanceof Common && last.IsNumberWithoutDecimal()) {
  const result = new BranchConditionResult();
  result.Success = false;
  return result;
}
const result = new BranchConditionResult();
result.Success = unit.Template.SymbolTemplate.IsSymbol(source.Value);
result.Message = 0;
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

`Message` 为 `0` 就开一个新 `Symbol` 并签入；为 `1` 就追加到上一个。

新建时**先看关闭的结果**（`State`）：`Built` 说明关闭上一个 token 的过程建出了形状，当前字符要 reload 给新形状重吃。`Created` 只是结果，不拿它当判据。

两个分支都以「签出到当前字符」收尾，所以字符不会漏进下一个单元。

```ts
if (result.Message === 0) {
  const created = unit.AddAndCloseLast(new Symbol(unit.Template));
  if (created.State === CloseStates.Built) {
    context.Messages.push(new ReloadMessage(unit, unit, source));
    return;
  }
  created.Created!.AppendAndSignOut(source).SignIn(source);
} else {
  (unit.Last() as Symbol)!.AppendAndSignOut(source);
}
```

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

失败时把上一个 `Symbol` 关闭——不关的话它会一直敞开，后面每个字符都要重新问一遍能不能续接。

```ts
const last = unit.Last();
if (last instanceof Symbol) {
  last.TryToClose();
}
```

# class Symbol extends BlockToken

符号块。

单元值类型是单字符的 `string`。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## static readonly field AppendIn:SymbolBranch = new SymbolBranch()

注册进通用跳转队列用的实例。

## constructor:(Template:Template)=>void

转调基类构造器。

```ts
super(Template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块。

两段判定：`Temp` 还是空的、且当前字符是符号，就能（开头的符号直接收）；否则要求当前字符是符号，**并且** `Temp` 现有内容加上当前字符能构成一个组合符号。

「首字符也要求是符号」不是冗余：`SymbolBranch` 已经筛过一次，但 `IsAppend` 也可能被别处问到，判据写全了才不会在非符号字符上吞穿。

```ts
if (this.Temp.length === 0 && this.Template.SymbolTemplate.IsSymbol(Src.Value)) {
  return true;
}
return this.Template.SymbolTemplate.IsSymbol(Src.Value)
  && this.Template.SymbolTemplate.IsCombinedSymbol(this.Temp.join("") + Src.Value);
```

## method Is:(value:string)=>bool

`Temp` 里的内容是否逐字符等于 `value`。

用来问「这一格是不是某个标点」，与 `Common.Is` 同款。

```ts
if (this.Temp.length !== value.length) {
  return false;
}
for (let i = 0; i < this.Temp.length; i++) {
  if (this.Temp[i] !== value[i]) {
    return false;
  }
}
return true;
```

## method IsAny:(items:Array<string>)=>bool

`Temp` 里的内容是否命中 `items` 里的任意一项。

这是 `Is` 的多项版本，参数个数与单参版不同，所以叫 `IsAny`。

```ts
return items.includes(this.TempToString());
```

## protected method Close:()=>CloseStates

关闭：只把自己标记为已关闭，返回 `Nothing`。

**它不问父单元要不要重算候选**——与 `Common.Close` 不同。符号是**终结者**：`;`、`}` 这些字符由形状自己的 `ExitOrPre` 认领并顺手把形状关掉，那时形状已经闭合，再让候选目录去判一次只会判到一个「已经过去的」下标。`Common` 要问，是因为一个标识符的收尾本身就是子形状（名字、子句）完成的时刻。

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## method Clone:()=>Token

克隆自身。顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → `TryToClose()`。

```ts
const result = new Symbol(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```
