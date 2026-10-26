# dependencies
```xl
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class IdentifierIncompleteGuard

[S4:IDENT-COMPLETE] 标识符「什么时候算完成」的**唯一判据**（WP-S4 / R4-1）。

范本硬口径（`docs/expected-token-time-shapes.md` char 3/4/5）：`x` 还在长的那两格是 `Common`，
**名字闭合的那一格**（分隔符到达）才出现 `IdentifierShape`。`class-ball` 的 `text="半"` / `"颜"` /
`"数"` 就是「把『当前单元是标识符前缀』当成了『标识符已完成』」——形状在首字符那一格就建了出来，
src 区间随后逐格被拉长（`[152,153)` → `[152,154)`），账本因此出现「短于完整 token」的截断名。

**判据只有一条**：一个 `Common` 标识符在 `at` 那一格**完成**，当且仅当它**不可能再吸收下一个字符**：

1. 它后面已经有下一个**代码单元**（`;` / `=` / `)` / 另一个词……任何代码单元都意味着「下一字符没被
   它吸收」）⇒ 完成；
2. 它后面只有 trivia 或什么都没有 ⇒ 只剩「文档的下一个字符」能回答：下一个**代码点**不是标识符
   后继字符就是完成，是后继字符就**未完成**。

第 2 条是中文标识符的关键：`半` 后面是 `径`，两者都是 CJK 代码点，必须按**代码点**判后继，
不能按 UTF-16 code unit 或按字节判。代理对（astral plane 标识符）按 `charCodeAt` 组合成一个
代码点再判，绝不对半个代理对下结论。

所有标识符候选只许调 `IsComplete`，**不写第二份**「前缀是否完整」的判断。

## static method IsComplete:(units:Array<Token>, at:int)=>bool

```ts
if (at < 0 || at >= units.length) {
  return false;
}
const unit = units[at];
if (unit.IsTriviaToken) {
  return true;
}
if (!(unit instanceof Common)) {
  // 非 Common（Symbol / Bracket / String / 形状）没有「逐字符增长」的语义：本身就是完成的。
  return true;
}
// 1) 后面已经有代码单元 ⇒ 这个标识符不可能再吸收它 ⇒ 这一格就是完成格。
let next = at + 1;
while (next < units.length && units[next].IsTriviaToken) {
  next++;
}
if (next < units.length) {
  return true;
}
// 2) 后面只有 trivia / 什么都没有：只有文档的下一个字符能回答「还在长吗」。
const range = unit.SourceRange;
if (range === null) {
  return true;
}
const document = range.Document;
if (document === null) {
  return true;
}
const end = range.EndIndex;
if (end < 0) {
  return false;
}
// 「下一个字符」在**本单元的半开区间之外**：`range.At` 只接受 `[Start, End)`，直接问它会抛
// `SourceRangeIndexOutOfRange`（S4b 接线的第一版就在这里炸掉 48 条）。所以从整文档视图上取，
// 并先用 `Has` 判「文档是否到此为止」——EOF 处标识符不可能再长。
const whole = SourceRange.Whole(document);
if (!whole.Has(end)) {
  return true;
}
const following = whole.At(end);
if (following === null || following === undefined || following === "") {
  // 文档到头：标识符不可能再长。
  return true;
}
return !IdentifierIncompleteGuard.IsIdentifierPartText(following);
```

## static method IsIdentifierPartText:(text:string)=>bool

按**代码点**判一个字符串的首字符是不是标识符后继字符（字符串可能是代理对，也可能是空串）。

```ts
if (text === null || text === undefined || text.length === 0) {
  return false;
}
const codePoint = IdentifierIncompleteGuard.FirstCodePoint(text);
if (codePoint < 0) {
  return false;
}
return IdentifierIncompleteGuard.IsIdentifierPartCodePoint(codePoint);
```

## static method FirstCodePoint:(text:string)=>int

把首字符读成一个 Unicode 代码点：高代理后紧跟低代理时合并，否则就是那一个 code unit。

```ts
const first = text.charCodeAt(0);
if (first >= 0xD800 && first <= 0xDBFF && text.length > 1) {
  const second = text.charCodeAt(1);
  if (second >= 0xDC00 && second <= 0xDFFF) {
    return (first - 0xD800) * 0x400 + (second - 0xDC00) + 0x10000;
  }
}
return first;
```

## static method IsIdentifierPartCodePoint:(codePoint:int)=>bool

标识符**后继**字符集（TS 的 `ID_Continue` 近似）：ASCII 的字母 / 数字 / `_` / `$` / `\`（`\uXXXX`
转义可以出现在标识符中间），非 ASCII 的代码点按「不是宽空白、不是宽标点」放行——CJK 汉字、
全角字母、组合记号都是合法的标识符字符。

```ts
if (codePoint < 0) {
  return false;
}
if (codePoint >= 0x30 && codePoint <= 0x39) {
  return true;
}
if (codePoint >= 0x41 && codePoint <= 0x5A) {
  return true;
}
if (codePoint >= 0x61 && codePoint <= 0x7A) {
  return true;
}
if (codePoint === 0x24 || codePoint === 0x5F || codePoint === 0x5C) {
  return true;
}
if (codePoint < 0x80) {
  return false;
}
return !IdentifierIncompleteGuard.IsWideNonIdentifier(codePoint);
```

## static method IsWideNonIdentifier:(codePoint:int)=>bool

非 ASCII 里**不属于**标识符的代码点：宽空白与常见宽标点。这是显式闭集，不猜区间——
落不进本集合的非 ASCII 代码点一律算标识符后继（CJK 汉字因此天然正确）。

```ts
// 宽空白 / 不可见
if (codePoint === 0x00A0 || codePoint === 0x1680 || codePoint === 0x2028 || codePoint === 0x2029) {
  return true;
}
if (codePoint >= 0x2000 && codePoint <= 0x200A) {
  return true;
}
if (codePoint === 0x3000 || codePoint === 0xFEFF) {
  return true;
}
// 宽标点：引号 / 破折号 / 省略号 / 间隔号 / 顿号句号 / 括号书名号
if (codePoint >= 0x2010 && codePoint <= 0x2027) {
  return true;
}
if (codePoint === 0x00B7 || codePoint === 0x3001 || codePoint === 0x3002) {
  return true;
}
if (codePoint >= 0x3008 && codePoint <= 0x3011) {
  return true;
}
if (codePoint >= 0x3014 && codePoint <= 0x301B) {
  return true;
}
// 全角 ASCII 变体里的标点（全角字母 / 数字在 0xFF21-0xFF5A / 0xFF10-0xFF19，属标识符）
if (codePoint >= 0xFF01 && codePoint <= 0xFF0F) {
  return true;
}
if (codePoint >= 0xFF1A && codePoint <= 0xFF20) {
  return true;
}
if (codePoint >= 0xFF3B && codePoint <= 0xFF40) {
  return true;
}
if (codePoint >= 0xFF5B && codePoint <= 0xFF65) {
  return true;
}
return false;
```
