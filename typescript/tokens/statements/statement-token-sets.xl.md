# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
```

# namespace cangjie

R5-C3（R5-CONTRACT §1.4 C-3 / §4.8）：两套「按 token 文本判续接」的闭集在这里**唯一实现**，
消费者只做一行委托，不许再写第二份字面量表：

- **受限后缀闭集**（`IsRestrictedPostfixText` / `IsRestrictedPostfixUnit`）：换行之后这些都**不能**
  继续上一条表达式（TS `parsePostfixExpressionOrHigher` 的 `hasPrecedingLineBreak()` 守卫）。
  消费者：`StatementBoundaryUtil.IsRestrictedPostfixUnit`（边界层，D7）与
  `DirectExpressionEngine.IsRestrictedPostfix`（引擎层，C1）——两者吃不同的入参类型
  （`Token` / `string`），所以闭集同时给两个入口，但**表只有一份**。
- **表达式续接闭集**（`IsExpressionContinuation`）：换行之后还能接上一条表达式的单元。
  消费者：`ExpressionStatementPossibleShape.IsContinuation`（R4 起是 `IsAsiBoundary` 的 fallback）。

> 不在本文件（语义面不同，改它就是改整个语句层，R5-CONTRACT §1.4 C-3 明确排除）：
> `StatementScanner.ContinuesAcrossLine` / `StatementBuilder.ContinuesAcrossLine`。

# class StatementTokenSets

## static method IsRestrictedPostfixText:(text:string)=>bool

```ts
// D7（R3-CONTRACT §4.5 + R4-CONTRACT §4.2 A-3 + R5-A2）：跨行后**不能**继续上一条表达式的受限后缀文本。
// `++` / `--` 在 TS 里是后缀运算符（`parsePostfixExpressionOrHigher` 用 `hasPrecedingLineBreak()` 拒绝跨行）；
// `!` / `~` 不是二元运算符而是一元前缀的起点，同样接不上（`a ! b` / `a ~ b` 从来不是合法表达式）；
// `typeof` 同族（`a typeof b` 也不是表达式，它只能作**前缀**；R4 按 A-3 补进闭集）。
// `as` / `satisfies` 是 R5-A2（R5-CONTRACT §1.3 D3-f）补的：两者都只能**跟在操作数后面**（`a as T` /
// `a satisfies T`），行首出现时必是新语句（`let x = a` ⏎ `as b` = 3 条语句，tsc 实测，
// R5-TARGET-CASES §2 CL-pos-02/03）；边界层不在这里收口的话，`as` 会被当成上一条的 `AsExpression`。
// `keyof` / `unique` / `readonly` / `of` 仍不进来：它们要连带类型位判据，R5 不动。
return text === "++" || text === "--" || text === "!" || text === "~" || text === "typeof"
  || text === "as" || text === "satisfies";
```

## static method IsRestrictedPostfixUnit:(unit:Token)=>bool

```ts
// `Token` 版入口：只做**类型判别**（`++`/`--`/`!`/`~` 是 `Symbol`，`typeof`/`as`/`satisfies` 是 `Common`），
// 闭集本身仍只有 `IsRestrictedPostfixText` 一份。
if (!(unit instanceof Symbol) && !(unit instanceof Common)) {
  return false;
}
return StatementTokenSets.IsRestrictedPostfixText((unit as Symbol | Common).TempToString());
```

## static method IsExpressionContinuation:(unit:Token)=>bool

```ts
// 换行之后**仍然接得上**上一条表达式的单元（R2-C2 起的三段闭集：括号 / 模板 / 运算符 + 上下文关键字）。
// 这是 `ExpressionStatementPossibleShape.IsContinuation` 的唯一实现（R5-C2：原来 boundary 层还有一份
// `IsContinuationToken` 手工副本，随同一清理项删除）。
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[";
}
if (unit instanceof String) {
  return (unit as String).StringChar === "`";
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "+"
    || text === "-"
    || text === "*"
    || text === "/"
    || text === "%"
    || text === "**"
    || text === "<"
    || text === ">"
    || text === "<="
    || text === ">="
    || text === "=="
    || text === "!="
    || text === "==="
    || text === "!=="
    || text === "&"
    || text === "|"
    || text === "^"
    || text === "&&"
    || text === "||"
    || text === "??"
    || text === "<<"
    || text === ">>"
    || text === ">>>"
    || text === "="
    || text === "+="
    || text === "-="
    || text === "*="
    || text === "/="
    || text === "%="
    || text === "**="
    || text === "&="
    || text === "|="
    || text === "^="
    || text === "&&="
    || text === "||="
    || text === "??="
    || text === "<<="
    || text === ">>="
    || text === ">>>="
    || text === "."
    || text === "?."
    || text === ","
    || text === "?"
    || text === ":"
    || text === "=>"
    || text === "...";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "in" || text === "instanceof" || text === "as" || text === "satisfies";
}
return false;
```
