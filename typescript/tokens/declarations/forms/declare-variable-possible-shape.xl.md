# dependencies
```xl
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
import { StatementScanner } from "../../statements/statement-scanner.xl.md"
import { EndOfFileTokenShape } from "../../trivia/end-of-file-token-shape.xl.md"
import { IncrementalVariableStatementBuilder } from "../variable-declaration-possible-shape.xl.md"
```

# namespace cangjie

```
declare const x: number;
declare let x: number;
declare var x: number;
declare const sym: unique symbol
```

# class DeclareVariablePossibleShape extends PossibleShape

## static method Owns:(units:Array<Token>, headAt:int, secondAt:int)=>bool

```ts
if (headAt < 0 || headAt >= units.length || secondAt < 0 || secondAt >= units.length) {
  return false;
}
const head = units[headAt];
const second = units[secondAt];
if (!(head instanceof Common) || !(second instanceof Common)) {
  return false;
}
if (!(head as Common).Is("declare")) {
  return false;
}
const secondText = (second as Common).TempToString();
if (!(secondText === "const" || secondText === "let" || secondText === "var")) {
  return false;
}
// `declare` ⏎ `const` 是两条语句（`declare` 是标识符 / ExpressionStatement）：本族不认。
if (!StatementScanner.NoLineBreakBetween(head, second)) {
  return false;
}
// `declare const enum E {}` 归 enum 声明族（与 `StatementScanner.ScanRoot` 同一判据、同一函数）。
if (secondText === "const"
  && StatementScanner.NextWord(second.SourceRange.Document, second.SourceRange.EndIndex) === "enum") {
  return false;
}
return true;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
// 让位判据与 legacy 声明壳同一份（`ShouldYieldToDeclarationShell`），只对自己的声明头（`declare` +
// 同行变量关键字）跳过让位——照抄 module 声明候选的 `b3cOwns` 形状。
if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {
  const yieldStart = ItemUtil.ItemStartCached(units, cache);
  const yieldHead = ItemUtil.NextCode(units, yieldStart);
  const yieldSecond = yieldHead >= units.length ? -1 : ItemUtil.NextCode(units, yieldHead + 1);
  if (!(StatementRouteUtil.IsIncrementalShapesEnabled()
    && DeclareVariablePossibleShape.Owns(units, yieldHead, yieldSecond))) {
    return ShapeStates.Reject;
  }
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  // 首代码单元还没到（只有 trivia）：不许 Reject（CatalogGuide 会永久删除候选）。
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
// 首代码单元到了又不是 `declare`：这一格就能判死，**必须立刻 Reject**。拖到第二个代码单元再判
// （`Uncertain`）会让本候选与真正要建壳的候选（表达式 / 控制流 / 变量）同时活着，而
// `CatalogGuide` 只在「只剩一个候选」时建壳 —— 表达式语句 / `try` / `while` 等会全部退化成
// 原子建树（实测 47 条 tts-impl 回归）。Reject 是永久的，但 `Reset` 会复原，不影响下一条语句。
if (!(units[headAt] instanceof Common) || !(units[headAt] as Common).Is("declare")) {
  return ShapeStates.Reject;
}
const secondAt = ItemUtil.NextCode(units, headAt + 1);
if (secondAt >= units.length) {
  // 只有 `declare`：第二个代码单元还没到，族还没判出来，继续等。
  return ShapeStates.Uncertain;
}
if (!DeclareVariablePossibleShape.Owns(units, headAt, secondAt)) {
  return ShapeStates.Reject;
}
// `declare` + 变量关键字两格到齐也不建壳：绑定（标识符 / 解构括号）到齐才 `IsBuildable`，
// 这一格只保证候选活着（`Accept` = 不淘汰，建不建由 `IsBuildable` 决定）。
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
const secondAt = ItemUtil.NextCode(units, headAt + 1);
if (secondAt >= units.length || secondAt > tokenIndex) {
  return false;
}
if (!DeclareVariablePossibleShape.Owns(units, headAt, secondAt)) {
  return false;
}
const bindingAt = ItemUtil.NextCode(units, secondAt + 1);
return bindingAt <= tokenIndex && bindingAt < units.length
  && !(units[bindingAt] instanceof EndOfFileTokenShape)
  && StatementScanner.StartsBinding(units, bindingAt);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// 三层的建造仍由 `IncrementalVariableStatementBuilder.Build` 唯一负责；`declared` 变体只多做两件事：
// 跳过 `declare` 词再取声明关键字、把 `DeclareKeywordShape` 挂到语句最前（legacy
// `StatementBuilder.BuildDeclareVariableStatement` 的同一形状 / 同一 `Pos`）。
return IncrementalVariableStatementBuilder.Build(host, tokenIndex, context, true);
```
