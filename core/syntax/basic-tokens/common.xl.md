# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 AST 行。

通用字符块：标识符、数字、布尔字面量。它把连续的「不是符号、也不是空白」的字符吞进自己的 `Temp`，最终作为一行 `Common  src=[…)  text="abc"` 出现。

# class Common extends BlockToken

通用字符块。

单元值类型是单字符的 `string`。

没有覆写 `AstText`：文本由 `BlockToken.AstText` 给出（就是 `Temp`），转义由 `Token.AstEscape` 在拼 label 时统一做。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## constructor:(Template:Template)=>void

转调基类构造器。

```ts
super(Template);
```

## method IsAppend:(buffer:SourceRange, index:int, value:string)=>bool

能不能把窗口里 `index` 处的字符并进本块：不是符号、也不是空白就行。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：判定直接用它，不再为同一个字符复读。

`\u{…}` 花括号转义进行中时，`{` / 十六进制位 / `}` 也要并进同一个块（`}` 只在已有至少一位十六进制时）。

```ts
if (Common.IsUnicodeEscapeStart(buffer, index, this.Template, value)) {
  return true;
}
if (this.Template.SymbolTemplate.SupportUnicodeEscapeIdentifier) {
  const digits = this.UnicodeBraceEscapeDigits();
  if (digits === 0 && value === "{") {
    return true;
  }
  if (digits > 0) {
    if (value === "}") {
      return true;
    }
    if (!this.Template.SymbolTemplate.IsHexDigit(value)) {
      return false;
    }
    // 位数不限（`\u{0000061}` / `\u{0001D400}` 合法）：只有「再补一位」还落在 Unicode 标量上限内
    // 才继续收。前缀全零时值为 0，可以任意长；越界的转义 `Common.IsUnicodeEscapeStart` 本就不会放行。
    return this.UnicodeBraceEscapeValue() * 16 <= Common.MaxUnicodeCodePoint();
  }
}
return !(this.Template.SymbolTemplate.IsSymbol(value) || this.Template.SymbolTemplate.IsWhiteSpace(value));
```

## static method MaxUnicodeCodePoint:()=>int

Unicode 标量值上限（`U+10FFFF`）：`\u{…}` 的累计码点超过它就非法。这是 **Unicode 定义**、
与目标语言无关，可以留在 core；ECMAScript 的「位数不限」由既有开关
`SymbolTemplate.SupportUnicodeEscapeIdentifier`（默认关闭）表达，其它语言零影响。

```ts
return 0x10FFFF;
```

## static method IsUnicodeEscapeStart:(buffer:SourceRange, index:int, template:Template, value:string)=>bool

`index` 处是不是一个**合法**的转义标识符起点：`\` + `u` + 4 个十六进制字符（`\uXXXX`），
或 `\` + `u` + `{` + 1 个及以上十六进制字符 + `}`（`\u{…}`，位数不限，累计码点 ≤ `U+10FFFF`）。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：第一道 `\` 判定直接用它。

语言开关（`SymbolTemplate.SupportUnicodeEscapeIdentifier`）关闭时恒 `false`，其它语言零影响；
不足位数 / 非十六进制 / 不是 `\` / 花括号形未闭合或码点越界一律 `false`（这些情况保持旧的“落回符号层”行为）。
 `buffer` 只是 `[index, index + BufferSize)` 的窗口，所以前探要经 `SourceRange.Whole(buffer.Document!)`；位置口径仍是原文。

```ts
if (!template.SymbolTemplate.SupportUnicodeEscapeIdentifier) {
  return false;
}
if (value !== "\\") {
  return false;
}
const whole = SourceRange.Whole(buffer.Document!);
const count = whole.EndIndex;
if (index + 2 >= count) {
  return false;
}
if (whole.At(index + 1) !== "u") {
  return false;
}
if (whole.At(index + 2) === "{") {
  // `\u{hex+}`：位数不限（前导零可任意多），累计码点 ≤ 0x10FFFF、必须以 `}` 收口。
  let at = index + 3;
  let digits = 0;
  let value = 0;
  while (at < count && template.SymbolTemplate.IsHexDigit(whole.At(at))) {
    value = value * 16 + Number.parseInt(whole.At(at), 16);
    digits++;
    at++;
    // 前导零会把数字串拉任意长而值仍是 0；一旦累计值越界，继续补位只会更大 ⇒ 当场判非法。
    // 这也把乘法限制在 0x10FFFF * 16 之内，不会溢出。
    if (value > Common.MaxUnicodeCodePoint()) {
      return false;
    }
  }
  if (digits === 0 || at >= count || whole.At(at) !== "}") {
    return false;
  }
  return true;
}
if (index + 6 > count) {
  return false;
}
for (let offset = 2; offset <= 5; offset++) {
  if (!template.SymbolTemplate.IsHexDigit(whole.At(index + offset))) {
    return false;
  }
}
return true;
```

## method UnicodeBraceEscapeDigits:()=>int

正在写 `\u{…}` 时已收的十六进制位数：`0` = 刚读完 `\u`、还在等 `{`；`-1` = 不在花括号转义里。
先看 `HasBackslash` 快速短路：`Temp` 里从没出现过 `\` 的 token 直接 `-1`，不做逐字符扫描；
有 `\` 才从 `Temp` 尾部推（最后一个 `\` 起是否 `\u` / `\u{hex*}`）。

```ts
if (!this.HasBackslash) {
  return -1;
}
const text = this.TempToString();
const backslash = text.lastIndexOf("\\");
if (backslash < 0) {
  return -1;
}
const tail = text.substring(backslash);
if (tail === "\\u") {
  return 0;
}
if (!tail.startsWith("\\u{")) {
  return -1;
}
const body = tail.substring(3);
if (body.indexOf("}") >= 0) {
  return -1;
}
for (let index = 0; index < body.length; index++) {
  if (!this.Template.SymbolTemplate.IsHexDigit(body[index])) {
    return -1;
  }
}
return body.length;
```

## method UnicodeBraceEscapeValue:()=>int

正在写 `\u{…}` 时已收的十六进制位累计出的码点值（`-1` = 不在花括号转义里 / 不是合法十六进制串）。
与 `UnicodeBraceEscapeDigits` 看同一段 `Temp` 尾部；累计值一越过 Unicode 标量上限就封顶返回
`MaxUnicodeCodePoint + 1`——调用方只用它判「再补一位会不会越界」，封顶后不再乘 16，避免数值溢出。

```ts
if (!this.HasBackslash) {
  return -1;
}
const text = this.TempToString();
const backslash = text.lastIndexOf("\\");
if (backslash < 0) {
  return -1;
}
const tail = text.substring(backslash);
if (!tail.startsWith("\\u{")) {
  return -1;
}
const body = tail.substring(3);
if (body.indexOf("}") >= 0) {
  return -1;
}
let value = 0;
for (let index = 0; index < body.length; index++) {
  if (!this.Template.SymbolTemplate.IsHexDigit(body[index])) {
    return -1;
  }
  value = value * 16 + Number.parseInt(body[index], 16);
  if (value > Common.MaxUnicodeCodePoint()) {
    return Common.MaxUnicodeCodePoint() + 1;
  }
}
return value;
```

## static method IsInUnicodeBraceEscape:(unit:Token)=>bool

最上层打开的 `Common` 是不是正在写 `\u{…}`：`Bracket` / `Symbol` 的跳转在这时让位，
让 `{` / 十六进制位 / `}` 继续并进那个 `Common`，而不是被括号或符号抢走。

```ts
const last = unit.Last();
if (!(last instanceof Common)) {
  return false;
}
const token = last as Common;
if (token.Closed) {
  return false;
}
if (!token.Template.SymbolTemplate.SupportUnicodeEscapeIdentifier) {
  return false;
}
return token.UnicodeBraceEscapeDigits() >= 0;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值要**原样带上去**：建出了形状时，正在被建的那个 token 的收尾就变成了「形状已就位，当前字符该重放」。

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

## method IsNumberWithoutDecimal:()=>bool

`Temp` 是不是「可以接小数点的十进制整数前缀」：只有数字与合法位置的 `_`，至少一位数字。

它给 `Transit` 的「小数点并入上一个数字块」用：`1.5` / `1_0.5_0` 的点能并进去，`0x1F` 不能（含进制前缀），`1_` 不能（分隔符悬空）。

```ts
const text = this.TempToString();
if (text.length === 0) {
  return false;
}
let lastIsDigit = false;
for (let index = 0; index < text.length; index++) {
  const item = text[index];
  if (this.Template.SymbolTemplate.IsNumber(item)) {
    lastIsDigit = true;
  } else if (item === "_" && lastIsDigit && index < text.length - 1) {
    lastIsDigit = false;
  } else {
    return false;
  }
}
return lastIsDigit;
```

## method CanStartNumber:()=>bool

`Temp` 的第一个字符能不能起一个数字字面量：数字，或 `.` 后面紧跟数字。

形状层（`ExpressionStatementPossibleShape.CanStart` 与 `ExpressionBuilder.StartsNumber`）共用这一条判据，避免两处各写一份。

```ts
const text = this.TempToString();
if (text.length === 0) {
  return false;
}
if (this.Template.SymbolTemplate.IsNumber(text[0])) {
  return true;
}
return text[0] === "." && text.length > 1 && this.Template.SymbolTemplate.IsNumber(text[1]);
```

## method IsExponentPrefix:()=>bool

`Temp` 是不是「十进制数字前缀 + 结尾 `e`/`E`」：`1e` / `1.5e` / `1.e` / `.5e` / `1_0e` 为 true；`0x1e` / `a1e` / `e` 为 false。

`Transit` 用它决定 `+`/`-` 是不是指数符号。合法程序里 `…e` 后面只可能是指数数字或指数符号，所以这里不需要看下一个字符。

```ts
const text = this.TempToString();
if (text.length < 2) {
  return false;
}
const last = text[text.length - 1];
if (last !== "e" && last !== "E") {
  return false;
}
return this.IsDecimalPrefix(text.substring(0, text.length - 1));
```

## method IsNumber:()=>bool

`Temp` 是不是 TS 的 NumericLiteral（不含 BigInt）：去掉语言配置允许的普通后缀之后，正文要满足十进制 / 十六进制 / 二进制 / 八进制文法，`_` 只能夹在两位数字之间。

先按「没有后缀」校验整串，是为了让 `0x1d` 里的 `d` 仍然算十六进制数字、不被后缀抢走；只有整串不成立时才去剥后缀。

```ts
const text = this.TempToString();
if (this.IsNumberBody(text)) {
  return true;
}
const suffix = this.Template.NumberTemplate.MatchPlainSuffix(text);
if (suffix === null || suffix.length >= text.length) {
  return false;
}
return this.IsNumberBody(text.substring(0, text.length - suffix.length));
```

## method IsBigInt:()=>bool

`Temp` 是不是 BigInt 字面量：尾部必须是 `NumberTemplate` 配置的 BigInt 后缀，去掉后缀的正文是整数文法（十进制 / 十六进制 / 二进制 / 八进制），不能带小数或指数。

```ts
const text = this.TempToString();
const suffix = this.Template.NumberTemplate.MatchBigIntSuffix(text);
if (suffix === null || suffix.length >= text.length) {
  return false;
}
return this.IsBigIntBody(text.substring(0, text.length - suffix.length));
```

## method NumberBody:()=>string

`Temp` 去掉普通后缀后的正文。`_` 原样保留，要不要剥、怎么规范化由目标语言的形状层决定。

```ts
const text = this.TempToString();
if (this.IsNumberBody(text)) {
  return text;
}
const suffix = this.Template.NumberTemplate.MatchPlainSuffix(text);
if (suffix === null || suffix.length >= text.length) {
  return text;
}
return text.substring(0, text.length - suffix.length);
```

## method BigIntBody:()=>string

`Temp` 去掉 BigInt 后缀后的正文，`_` 原样保留。

```ts
const text = this.TempToString();
const suffix = this.Template.NumberTemplate.MatchBigIntSuffix(text);
if (suffix === null || suffix.length >= text.length) {
  return text;
}
return text.substring(0, text.length - suffix.length);
```

## private method IsDigitRun:(text:string)=>bool

一串十进制数字：至少一位数字，`_` 只能出现在两位数字之间。

```ts
if (text.length === 0) {
  return false;
}
let previousIsDigit = false;
for (let index = 0; index < text.length; index++) {
  const item = text[index];
  if (this.Template.SymbolTemplate.IsNumber(item)) {
    previousIsDigit = true;
  } else if (item === "_" && previousIsDigit && index + 1 < text.length) {
    previousIsDigit = false;
  } else {
    return false;
  }
}
return previousIsDigit;
```

## private method IsDecimalInteger:(text:string)=>bool

十进制整数：是数字串，且没有前导零（`0` 本身除外，`0777` 这类 legacy octal 在 TS 里不合法）。

```ts
if (!this.IsDigitRun(text)) {
  return false;
}
if (text.length > 1 && text[0] === "0") {
  return false;
}
return true;
```

## private method IsDecimalPrefix:(text:string)=>bool

十进制数字**前缀**：`1` / `1.` / `1.5` / `.5` / `1_0.5_0`；允许没有小数部分，也允许没有整数部分，但至少要有数字。

```ts
if (text.length === 0) {
  return false;
}
if (text[0] === ".") {
  return this.IsDigitRun(text.substring(1));
}
let dotIndex = -1;
for (let index = 0; index < text.length; index++) {
  if (text[index] === ".") {
    if (dotIndex >= 0) {
      return false;
    }
    dotIndex = index;
  }
}
if (dotIndex < 0) {
  return this.IsDigitRun(text);
}
const head = text.substring(0, dotIndex);
const tail = text.substring(dotIndex + 1);
if (!this.IsDigitRun(head)) {
  return false;
}
if (tail.length === 0) {
  return true;
}
return this.IsDigitRun(tail);
```

## private method IsDecimalNumber:(text:string)=>bool

十进制数字（不含后缀）：拆出指数段、小数点后逐段校验。

```ts
let exponentIndex = -1;
for (let index = 0; index < text.length; index++) {
  const item = text[index];
  if (item === "e" || item === "E") {
    if (exponentIndex >= 0) {
      return false;
    }
    exponentIndex = index;
  }
}
let mantissa = text;
if (exponentIndex >= 0) {
  mantissa = text.substring(0, exponentIndex);
  let exponent = text.substring(exponentIndex + 1);
  if (exponent.length === 0) {
    return false;
  }
  if (exponent[0] === "+" || exponent[0] === "-") {
    exponent = exponent.substring(1);
  }
  if (!this.IsDigitRun(exponent)) {
    return false;
  }
}
let dotIndex = -1;
for (let index = 0; index < mantissa.length; index++) {
  if (mantissa[index] === ".") {
    if (dotIndex >= 0) {
      return false;
    }
    dotIndex = index;
  }
}
if (dotIndex < 0) {
  return this.IsDecimalInteger(mantissa);
}
const head = mantissa.substring(0, dotIndex);
const tail = mantissa.substring(dotIndex + 1);
if (head.length === 0) {
  return this.IsDigitRun(tail);
}
if (!this.IsDecimalInteger(head)) {
  return false;
}
if (tail.length === 0) {
  return true;
}
return this.IsDigitRun(tail);
```

## private method IsRadixDigit:(item:string, radix:int)=>bool

某个字符在指定进制里算不算数字：`radix` 取 2 / 8 / 16，分别按二进制 / 八进制 / 十六进制的数字集判断。

```ts
if (item >= "0" && item <= "9") {
  if (radix === 2) {
    return item === "0" || item === "1";
  }
  if (radix === 8) {
    return item >= "0" && item <= "7";
  }
  return true;
}
if (radix === 16) {
  return (item >= "a" && item <= "f") || (item >= "A" && item <= "F");
}
return false;
```

## private method IsRadixRun:(text:string, radix:int)=>bool

一串指定进制的数字：至少一位，`_` 只能夹在两位数字之间。

```ts
if (text.length === 0) {
  return false;
}
let previousIsDigit = false;
for (let index = 0; index < text.length; index++) {
  const item = text[index];
  if (this.IsRadixDigit(item, radix)) {
    previousIsDigit = true;
  } else if (item === "_" && previousIsDigit && index + 1 < text.length) {
    previousIsDigit = false;
  } else {
    return false;
  }
}
return previousIsDigit;
```

## private method IsNumberBody:(text:string)=>bool

NumericLiteral 正文（已去后缀）：先认进制前缀，再按十进制数字校验。

```ts
if (text.length === 0) {
  return false;
}
if (text.length > 2 && text[0] === "0") {
  const prefix = text[1];
  if (prefix === "x" || prefix === "X") {
    return this.IsRadixRun(text.substring(2), 16);
  }
  if (prefix === "b" || prefix === "B") {
    return this.IsRadixRun(text.substring(2), 2);
  }
  if (prefix === "o" || prefix === "O") {
    return this.IsRadixRun(text.substring(2), 8);
  }
}
return this.IsDecimalNumber(text);
```

## private method IsBigIntBody:(text:string)=>bool

BigInt 正文（已去后缀）：只能是指定进制的整数，不能带小数点或指数。

```ts
if (text.length === 0) {
  return false;
}
if (text.length > 2 && text[0] === "0") {
  const prefix = text[1];
  if (prefix === "x" || prefix === "X") {
    return this.IsRadixRun(text.substring(2), 16);
  }
  if (prefix === "b" || prefix === "B") {
    return this.IsRadixRun(text.substring(2), 2);
  }
  if (prefix === "o" || prefix === "O") {
    return this.IsRadixRun(text.substring(2), 8);
  }
}
return this.IsDecimalInteger(text);
```


## method IsBool:()=>bool

`Temp` 里的内容是不是 `true` / `false` 字面量。

```ts
const text = this.TempToString();
return text === "true" || text === "false";
```

## method Is:(value:string)=>bool

`Temp` 里的内容是否逐字符等于 `value`。

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

```ts
return items.includes(this.TempToString());
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

判定、收尾、新开都在这一个方法里：

- **指数符号**：当前字符是 `+`/`-`，且上一个未关闭的 `Common` 是十进制指数前缀 → 并进那个块。合法程序里 `…e` 之后只可能是指数数字或指数符号，所以这里不看下一个字符；
- **前导点**：上一个单元是未关闭的、内容恰好为 `.` 的 `Symbol`，当前字符是数字 → 用新数字块顶替它（`Symbol` 在 `Transit` 里被丢弃，字符由 `Common` 接管）；
- 上一个单元是未关闭的 `Common`：`.` 且它是纯数字 → 追加；`IsAppend` → 追加；否则先 `TryToClose` 它，建出形状就返回 `Reload`；
- 收尾之后（或本来就没有 `Common` 可续接）：当前字符是符号或空白 → `Undo`，交给后面的分支；
- 其余 → 开新块：先 `last.TryToClose(context)`，建出形状就返回 `Reload`，否则加新单元、签入当前字符并 `Done`。

```ts
const template = unit.Template;
const last = unit.Last();
if ((value === "+" || value === "-")
    && last instanceof Common && !last.Closed
    && last.IsExponentPrefix()) {
  last.AppendAndSignOut(value, index);
  return BranchStates.Done;
}
if (last instanceof Symbol && !last.Closed
    && last.TempToString() === "."
    && template.SymbolTemplate.IsNumber(value)) {
  const dot = last as Symbol;
  const number = new Common(template);
  number.SignInToken(dot);
  number.AppendValueAndSignOut(".", dot.SourceRange.EndIndex - 1);
  dot.Replace(number);
  number.AppendAndSignOut(value, index);
  return BranchStates.Done;
}
if (last instanceof Common && !last.Closed) {
  if (value === "." && template.SymbolTemplate.IsSymbol(value) && last.IsNumberWithoutDecimal()) {
    last.AppendAndSignOut(value, index);
    return BranchStates.Done;
  }
  if (last.IsAppend(buffer, index, value)) {
    last.AppendAndSignOut(value, index);
    return BranchStates.Done;
  }
  if (last.TryToClose(context) === CloseStates.Built) {
    return BranchStates.Reload;
  }
}
if ((template.SymbolTemplate.IsSymbol(value) || template.SymbolTemplate.IsWhiteSpace(value))
    && !Common.IsUnicodeEscapeStart(buffer, index, template, value)) {
  return BranchStates.Undo;
}
if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
unit.Add(new Common(unit.Template));
(unit.Last() as Common)!.AppendAndSignOut(value, index).SignIn(index);
return BranchStates.Done;
```
