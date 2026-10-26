# dependencies
```xl
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

**ambient 变量声明（`declare const|let|var …`）的提前挂壳候选（WP-A2-D3）。**

```
declare const x: number;
declare let x: number;
declare var x: number;
declare const sym: unique symbol
```

legacy 链路是 `StatementBuilder.BuildDeclareVariableStatement`：收掉 `declare`、按普通变量语句建
`VariableStatementShape → VariableDeclarationListShape → VariableDeclarationShape`、把语句 `Pos` 改成
`declare` 的位置、最后把 `DeclareKeywordShape` 插到语句 `Data` 最前。本候选做的是同一件事，只是把
「等整条语句收口」换成「在绑定格提前挂三层壳」——三层本身就是增量建造的（
`IncrementalVariableStatementBuilder.Build` 的 `declared` 变体），所以 `DeclareKeywordShape` 在挂壳时
就按 legacy 的类名 / `Pos` / `src` 建好。

**为什么建在绑定格而不是 `declare` 格**：`declare` 这一格第二个代码单元还没到，语句首属于哪一族
（`declare function` / `declare namespace` / `declare const`）还判不出来；而通用声明壳
（`DeclarationStatementPossibleShape` / `ControlFlowStatementPossibleShape`）在 `declare` 格仍然
`Accept`（它们要等到第二个代码单元才 Reject），两个候选同时活着时 `CatalogGuide` 不建壳。到
`const` 格，两处 `[XL-B3f]` 让位段与本候选的 `Owns` 用同一份判据把它们 `Reject` 掉，本候选成为唯一
活口；绑定 `x` 那一格 `IsBuildable` 成立，三层壳连同 `declare` 词一次搬完。

**三处同源（本 WP 的硬约束）**：① 本文件的 `Owns`；② `declaration-statement-possible-shape` 的
`[XL-B3f]` 段；③ `control-flow-statement-possible-shape` 的 `[XL-B3f]` 段。②③ 都调用 `Owns`，
不再各写一份关键字表——否则「同格双 Accept」或「无人建壳」。`declare` 与变量关键字之间换行是
**两条语句**（TS 的修饰词解析要求同一行），由 `StatementScanner.NoLineBreakBetween` 排除；这条判据与
`StatementScanner.ScanRoot` 的 ambient 变量分支、`StatementRouteUtil.DecideDeclaration` 的
`declare` ⏎ 后继判据**是同一个函数**，不新写行终止符判定。`declare const enum` 归 enum 声明族
（与 `StatementScanner.ScanRoot` 同一处 `NextWord === "enum"` 排除）。

# class DeclareVariablePossibleShape extends PossibleShape

## static method Owns:(units:Array<Token>, headAt:int, secondAt:int)=>bool

`declare` + 同一行的 `const|let|var` = 本族接管。三处同源判据的**唯一实现**。

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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

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

绑定位到齐才搬单元：`Build` 需要 `const|let|var` 与其后的绑定一起进 `moved`，否则三层壳的
`list.Pos` / `declaration.Pos` / `IdentifierShape` 都没有可算的单元。

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
