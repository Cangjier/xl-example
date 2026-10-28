# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { PossibleSource } from "../possible-source.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

# class Common extends BlockToken

## field IsBasicToken:bool = true

## constructor:(Template:Template)=>void

```ts
super(Template);
```

## method IsAppend:(buffer:SourceRange, index:int, value:string)=>bool

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

```ts
return 0x10FFFF;
```

## static method IsUnicodeEscapeStart:(buffer:SourceRange, index:int, template:Template, value:string)=>bool

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

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## method IsNumberWithoutDecimal:()=>bool

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

```ts
const text = this.TempToString();
const suffix = this.Template.NumberTemplate.MatchBigIntSuffix(text);
if (suffix === null || suffix.length >= text.length) {
  return false;
}
return this.IsBigIntBody(text.substring(0, text.length - suffix.length));
```

## method NumberBody:()=>string

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

```ts
const text = this.TempToString();
const suffix = this.Template.NumberTemplate.MatchBigIntSuffix(text);
if (suffix === null || suffix.length >= text.length) {
  return text;
}
return text.substring(0, text.length - suffix.length);
```

## private method IsDigitRun:(text:string)=>bool

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

```ts
const text = this.TempToString();
return text === "true" || text === "false";
```

## method Is:(value:string)=>bool

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

```ts
return items.includes(this.TempToString());
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

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
