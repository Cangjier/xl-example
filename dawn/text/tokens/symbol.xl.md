# dependencies
```xl
import { BlockToken } from "../../../core/syntax/block-token.xl.md"
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Common } from "./common.xl.md"
import { IsUnicodeEscapeStart } from "../text-common-util.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

符号块：`=`、`+`、`*`、`{`、`.` 这些。它比 `Common` 多一层「组合符号」判断——`Temp` 里的内容加上当前字符如果构成 `+=`、`??`、`=>` 这类多字符符号，就继续吞；否则断开重开。

`SymbolBranch` 写在 `Symbol` **之前**。

# class SymbolBranch extends Branch

判定顺序：

1. 当前字符不是符号 → 失败。
   **例外**：`\` 后面跟着 `u` 加十六进制时**也让路**（那是标识符里的 Unicode 转义，
   由 `CommonBranch` 接手；判据是 `../text-common-util.xl.md` 的 `IsUnicodeEscapeStart`）。
2. 上一个单元也是 `Symbol`：已关闭就开新的（`Message = 0`）；没关闭就看它的 `IsAppend`，能续就 `Message = 1`，不能续也开新的（`Message = 0`）。
3. 上一个单元是 `Common` 且当前字符是 `.`、且那个 `Common` 是纯数字 → 失败（小数点交给 `Common` 自己吃）。
   **注意这条排在「上一个单元也是 Symbol」之后**，所以只有上一个不是 `Symbol` 时才会走到。
4. 其余：当前字符算符号就接手，`Message = 0`。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判断要不要接手当前字符，以及是「新增」还是「追加」。

```ts
const value = source.Value;
if (!unit.Template.SymbolTemplate.IsSymbol(value)) {
  const result = new BranchConditionResult();
  result.Success = false;
  return result;
}
if (value === "\\" && IsUnicodeEscapeStart(source.Document, source.Index)) {
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

`Message` 为 `0` 就开一个新 `Symbol` 并签入，为 `1` 就追加到上一个。

```ts
if (result.Message === 0) {
  unit.AddAndCloseLast(new Symbol(unit.Template)).AppendAndSignOut(source).SignIn(source);
} else {
  (unit.Last() as Symbol)!.AppendAndSignOut(source);
}
```

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

失败时把上一个 `Symbol` 关掉。

```ts
const last = unit.Last();
if (last instanceof Symbol) {
  last.TryToClose();
}
```

# class Symbol extends BlockToken

符号块。

单元值类型是单字符的 `string`。

## static readonly field AppendIn:SymbolBranch = new SymbolBranch()

把 `SymbolBranch` 注册进通用跳转队列用的实例。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块。

两段判定：
- `Temp` 还是空的、且当前字符是符号 → 能（开头的符号直接收）。
- 否则要求当前字符是符号，**并且** `Temp` 现有内容加上当前字符能构成一个组合符号。

```ts
if (this.Temp.length === 0 && this.Template.SymbolTemplate.IsSymbol(Src.Value)) {
  return true;
}
return this.Template.SymbolTemplate.IsSymbol(Src.Value)
  && this.Template.SymbolTemplate.IsCombinedSymbol(this.Temp.join("") + Src.Value);
```

## method Is:(value:string)=>bool

`Temp` 里的内容是否逐字符等于 `value`。

先比长度，再逐字符比。

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

## method IsValueOrAny:(value:string, items:Array<string>)=>bool

先比 `value`，再在 `items` 里找。

先看单项、再看列表的版本叫 `IsValueOrAny`。

```ts
const text = this.TempToString();
if (text === value) {
  return true;
}
return items.includes(text);
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → `TryToClose()`。

```ts
const result = new Symbol(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```
