# dependencies
```xl
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class IdentifierIncompleteGuard

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
