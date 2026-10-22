# dependencies
```xl
import { SymbolTemplate } from "../../core/syntax/templates/symbol-template.xl.md"
```

# namespace cangjie

运行层：**TypeScript 的空白字符表**。

core 的 `SymbolTemplate.IsWhiteSpace` 只认四种空白（空格 / `\t` / `\r` / `\n`），而 ECMAScript 的
WhiteSpace 还包含 `\v`（U+000B）与 `\f`（U+000C）。TS 词法把这两个字符当 trivia，本仓却把它们当普通字符：
`Common` 会把它们吞进标识符（`throw e\f` 的 `Identifier` End 撑到 8），数字模板会报「不是数字字面量: 1\f」，
语句后的 `\f` 还会被当成独立的 `Identifier` 表达式语句（`class C {}\f` 多出 `ExpressionStatement + Identifier`）。
这是「trivia 被吞 → Pos/End 偏移」的 end build 缺口。

只在 ts 模板上收口（core 不动）：`TypescriptTemplate.Create` 用本页的符号模板替换默认值。

# class TypeScriptSymbolTemplate extends SymbolTemplate

ts 的符号模板：空白字符集按 ECMAScript 口径补 `\v` / `\f`。

`WrapSymbol` 的 `Transit` 与 `Common` / 数字模板 / `Symbol` 的字符判据都问这一个方法，所以只覆写
`IsWhiteSpace` 就够：`\v` / `\f` 会被空白块认领成 trivia，不再进 `Common`，判形状时被跳过，收进形状后
由 `Close` 丢弃——于是 `Pos` / `End` 不再被这两个字符撑大。

## method IsWhiteSpace:(item:string)=>bool

是不是 TS 眼里的空白字符：core 的四种之外再加 `\v`（U+000B）与 `\f`（U+000C）。

```ts
if (super.IsWhiteSpace(item)) {
  return true;
}
return item === "\u000B" || item === "\u000C";
```
