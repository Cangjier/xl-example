# dependencies
```xl
import { SymbolTemplate } from "../../core/syntax/templates/symbol-template.xl.md"
```

# namespace cangjie

运行层：**TypeScript 的空白字符表**。

core 的 `SymbolTemplate.IsWhiteSpace` 只认四种空白（空格 / `\t` / `\r` / `\n`），而 ECMAScript 的
WhiteSpace 还包含 `\v`（U+000B）、`\f`（U+000C）、NBSP（U+00A0）、U+1680、U+2000–U+200B、
U+202F、U+205F、U+3000，LineTerminator 还包含 U+2028 / U+2029。TS 词法把这些字符都当 trivia，
本仓却把它们当普通字符：`Common` 会把它们吞进标识符（`throw e\f` 的 `Identifier` End 撑到 8），
数字模板会报「不是数字字面量: 1\f」，语句后的 `\f` 还会被当成独立的 `Identifier` 表达式语句
（`class C {}\f` 多出 `ExpressionStatement + Identifier`）；NBSP / U+3000 / U+2028 等更常见于从网页或
文档里粘贴来的代码，同样是「trivia 被吞 → 语句读不完 / 关键字不再是关键字」。
这是「trivia 被吞 → Pos/End 偏移」的 end build 缺口。

只在 ts 模板上收口（core 不动）：`TypescriptTemplate.Create` 用本页的符号模板替换默认值。

# class TypeScriptSymbolTemplate extends SymbolTemplate

ts 的符号模板：空白字符集按 ECMAScript 口径补齐（WhiteSpace + LineTerminator 全集）。

`WrapSymbol` 的 `Transit` 与 `Common` / 数字模板 / `Symbol` 的字符判据都问这一个方法，所以只覆写
`IsWhiteSpace` 就够：这些字符会被空白块认领成 trivia，不再进 `Common`，判形状时被跳过，收进形状后
由 `Close` 丢弃——于是 `Pos` / `End` 不再被这些字符撑大。

U+FEFF **不在**这张表里：它由 core 的 `Bom` basic token 认领（任意位置 trivia），
空白表再收一次会与 `Bom` 的起始判据抢字符。

## method IsWhiteSpace:(item:string)=>bool

是不是 TS 眼里的空白字符：core 的四种之外，再补 ECMAScript WhiteSpace 与 LineTerminator 的其余成员
（`\v` / `\f` / NBSP / U+1680 / U+2000–U+200B / U+2028 / U+2029 / U+202F / U+205F / U+3000）。

```ts
if (super.IsWhiteSpace(item)) {
  return true;
}
switch (item) {
  case "\u000B":
  case "\u000C":
  case "\u00A0":
  case "\u1680":
  case "\u2000":
  case "\u2001":
  case "\u2002":
  case "\u2003":
  case "\u2004":
  case "\u2005":
  case "\u2006":
  case "\u2007":
  case "\u2008":
  case "\u2009":
  case "\u200A":
  case "\u200B":
  case "\u2028":
  case "\u2029":
  case "\u202F":
  case "\u205F":
  case "\u3000":
    return true;
  default:
    return false;
}
```

## method IsCombineBlocked:(combined:string, following:string)=>bool

ECMAScript 的 `?.` 前瞻：**可选链的 `?.` 后面不能紧跟十进制数字**（`OptionalChainingPunctuator`：
`? .` 只有在后随字符不是 DecimalDigit 时才合成一个标点）。所以：

- `a?.b` / `a?.[k]` / `a?.(y)` / `a?.<T>(y)`：`?.` 后面不是数字 → 照旧合成 `?.`；
- `a?.5:b`：`.` 后面紧跟 `5` → 不合成 `?.`，词法上切成 `?` 与 `.5`，
  解析成条件表达式 `a ? .5 : b`（TS 6.0.3：ConditionalExpression + NumericLiteral `.5`，diag=0）。

core 的 `SymbolTemplate.IsCombineBlocked` 默认永不阻断，这里按 ECMAScript 口径覆写。
**不要**用 `BanCombineSymbol(["?."])` 代替：那会把所有可选链一起废掉。

```ts
if (combined === "?.") {
  return following >= "0" && following <= "9";
}
return super.IsCombineBlocked(combined, following);
```
