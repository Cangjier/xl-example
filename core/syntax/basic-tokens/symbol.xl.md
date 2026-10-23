# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
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

# class Symbol extends BlockToken

符号块。

单元值类型是单字符的 `string`。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## constructor:(Template:Template)=>void

转调基类构造器。

```ts
super(Template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块。

三段判定：`Temp` 还是空的、且当前字符是符号，就能（开头的符号直接收）；否则要求当前字符是符号，
**并且** `Temp` 现有内容加上当前字符能构成一个组合符号，**并且**语言模板的前瞻钩子没有否决它。

「首字符也要求是符号」不是冗余：`SymbolBranch` 已经筛过一次，但 `IsAppend` 也可能被别处问到，判据写全了才不会在非符号字符上吞穿。

组合符号表只回答「这两个字符合起来是不是某个标点」，看不到后一个字符；语言的前瞻规则
（例如 ECMAScript 的 `?.` 后随十进制数字不算可选链）由 `SymbolTemplate.IsCombineBlocked` 回答，
core 只负责把「组合符号后面紧跟的那个字符」递过去，默认不阻断。

```ts
if (this.Temp.length === 0 && this.Template.SymbolTemplate.IsSymbol(Src.Value)) {
  return true;
}
if (!this.Template.SymbolTemplate.IsSymbol(Src.Value)) {
  return false;
}
const combined = this.Temp + Src.Value;
if (!this.Template.SymbolTemplate.IsCombinedSymbol(combined)) {
  return false;
}
return !this.Template.SymbolTemplate.IsCombineBlocked(combined, Symbol.NextCharAfter(Src));
```

## static method NextCharAfter:(src:Source)=>string

`src` 后面紧跟的那一个字符（不跳空白 / 注释，就是词法上的下一格）；越界返回空串。

它是 `IsAppend` 递给 `IsCombineBlocked` 的 `following`：前瞻只看紧邻字符，`a?. 5` / `a?\n.5`
都不属于「后随十进制数字」。

```ts
const document = src.Document;
const count = document.GetCount();
const next = src.Index + 1;
if (next >= count) {
  return "";
}
return document.At(next).Value;
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

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，返回 `Nothing`。

**它不问父单元要不要重算候选**——与 `Common.Close` 不同。符号是**终结者**：`;`、`}` 这些字符由形状自己的 `ExitOrPre` 认领并顺手把形状关掉，那时形状已经闭合，再让候选目录去判一次只会判到一个「已经过去的」下标。`Common` 要问，是因为一个标识符的收尾本身就是子形状（名字、子句）完成的时刻。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## static method Transit:(context:SyntaxContext, unit:Token, source:Source)=>BranchStates

判定、收尾、新开都在这一个方法里：

- 当前符号是 `+`/`-`，且上一个未关闭的 `Common` 是十进制指数前缀 → `Undo`，把符号让给 `Common` 续进数字块；
- 当前字符不是符号 → 先 `Undo`；**若上一个单元是未关闭的孤立 `.` 且当前字符是数字，不关闭它**——留给 `Common` 顶替成数字块，提前关闭会先触发候选计算、把语句首的 `.5` 判成「没有候选形状」；
- 上一个 `Symbol` 未关闭且能续接（组合符号）→ 追加，`Done`；
- 上一个 `Symbol` 未关闭但接不上 → 关掉它，然后开新块；
- `.` 跟在纯数字 `Common` 后面 → `Undo`，小数点归 `Common` 吃；
- 其余开新块：先 `last.TryToClose(context)`，建出形状就返回 `Reload`。

```ts
const value = source.Value;
const template = unit.Template;
const last = unit.Last();
// `\u{…}` 花括号转义进行中：`{` / 十六进制位 / `}` 全归那个 Common，
// 符号层必须让位，否则 `}` 会把还没写完转义的 Common 提前关掉。
if (Common.IsInUnicodeBraceEscape(unit)) {
  return BranchStates.Undo;
}
if ((value === "+" || value === "-")
    && last instanceof Common && !last.Closed
    && last.IsExponentPrefix()) {
  return BranchStates.Undo;
}
if (value === "\\" && Common.IsUnicodeEscapeStart(source, template)) {
  return BranchStates.Undo;
}
if (!template.SymbolTemplate.IsSymbol(value)) {
  if (last instanceof Symbol && !last.Closed) {
    const numberTakesDot = last.TempToString() === "." && template.SymbolTemplate.IsNumber(value);
    if (!numberTakesDot && last.TryToClose(context) === CloseStates.Built) {
      return BranchStates.Reload;
    }
  }
  return BranchStates.Undo;
}
if (last instanceof Symbol && !last.Closed) {
  if (last.IsAppend(source)) {
    last.AppendAndSignOut(source);
    return BranchStates.Done;
  }
  if (last.TryToClose(context) === CloseStates.Built) {
    return BranchStates.Reload;
  }
} else if (value === "." && last instanceof Common && last.IsNumberWithoutDecimal()) {
  return BranchStates.Undo;
}
if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
unit.Add(new Symbol(unit.Template));
(unit.Last() as Symbol)!.AppendAndSignOut(source).SignIn(source);
return BranchStates.Done;
```
