# dependencies
```xl
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ControlFlowStatementPossibleShape } from "./control-flow-statement-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
```

# namespace cangjie

# class DeclarationStatementPossibleShape extends ControlFlowStatementPossibleShape

**根层声明 / 导入导出族的专用起点候选**（Stage 4r，晚建守卫 Stage 4t）。

它与 `ControlFlowStatementPossibleShape` 共用同一条建壳 / 收口 / 建树通道——**只重写两个判定**：
`ComputeByIndex` / `IsBuildable` 只认 `StatementRoute.ShellDeclarationFamily`，建壳仍由继承来的
`BuildByIndex` 完成（搬 raw 单元、`Kind` / 终结候选取 `ShellDeclarationFamily`、
`DeclarationShellCount` 计数分流都在那一份里，不复制第二套）。

**为什么单独一个候选，而不是把通用候选提到最前**：通用候选同时挂在块体目录
（`BlockPossibleShape.CreateBodyPossibleShapes`）上；在那里放开声明族会让块内声明被块体目录接管，
与并行成员的块内声明工作双挂载。本候选**只注册进根目录**，块体目录一个字不改。

**为什么要等 route 判出来才 Accept**：`type` / `module` / `declare` / `import` / `export` 是上下文关键字，
第二个代码单元没到时分不清「声明」与「标识符 / 表达式」（`type = 1`、`module.exports`、`import(`）。
这时 `Decide` 返回 `None`，本候选 `Uncertain`（不 `Reject`——`Reject` 被 `CatalogGuide` 永久删除）；
route 一旦判成 `ShellDeclarationFamily`，从**那一格起**都可以建壳（声明头可能比首代码单元晚一两格才判得出来，
`interface` / `enum` / `import` / `export` 都是这种形态），搬单元的范围仍由 `BuildByIndex` 的
`start..tokenIndex` 决定，与 legacy 声明候选的晚建口径一致。

**晚建守卫（Stage 4t）**：`tokenIndex > headAt` 只在「本条语句还收不了口」的中间格上补建。上一条语句已经
收口的那一格（`interface I { }` ⏎ `const a = 1;` 的 `const`、`type T = 1;` ⏎ `enum E` 的 `enum`）上
`ItemStart` 仍指向前一条语句、route 仍是声明族，若照旧 `Accept`，`BuildByIndex` 会把「已闭合的壳 + 下一条
语句的头」一起搬进新壳（S4r 的 `decl=2`、首节点 raw `Common`）。判据**不新写第二份**：与
`RootExpressionStatementPossibleShape` 的晚建守卫同一份 `StatementBoundaryUtil.CanEndStatement`
（`;` / EOF / ASI 三条同源），为真就 `Reject`、交回 legacy 在后面的格子 / EOF 建。

**让位门控**：13 个 legacy 候选（Import / Export / ImportEquals / ExportAssignment / NamespaceExport /
Class / Interface / Function / Enum / Module / TypeAlias + `expression-statement` + `variable-statement`）
在 `ComputeByIndex` 顶部对 `Decide === ShellDeclarationFamily` 主动 `Reject`——否则它们与本候选同格
`Accept`，`CatalogGuide` 会一直等（"接受"与"不确定"同义，只有只剩一个候选才建）。
`EnableDeclarationShell=false` 时 `Decide` 重新返回 `Legacy`，门控整体失效，行为逐位回到 Stage 4q。

**晚建格一律 Accept（S4z-r2）**：`tokenIndex > headAt` 时不再问 `CanEndStatementAt`——边界格由壳接管。
上一轮（Stage 4t）在这里 `Reject`，与 legacy 让位门控里同一个判据叠加，造成「门控让位 + 壳拒建」
的双退；现在门控单调（只看 `route`），壳在晚建格一律 `Accept`，把「已闭合的壳 + 下一条语句的头」
一起搬进新壳的问题改由 `BuildByIndex` 的**起点同步**解决（声明族且这一格之前已能收口时，
搬单元的起点收到 `tokenIndex`，已闭合的壳留在原处）。判据仍是同一份
`StatementBoundaryUtil.CanEndStatementAt`，只是搬到了 `BuildByIndex` 里。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableControlFlowShell) {
  return ShapeStates.Reject;
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
const route = StatementRouteUtil.Decide(units, tokenIndex);
if (route === StatementRoute.None) {
  // 上下文关键字的第二个代码单元还没到：继续等，不判死。
  return ShapeStates.Uncertain;
}
if (route !== StatementRoute.ShellDeclarationFamily) {
  return ShapeStates.Reject;
}
// 首格与晚建格一视同仁：都 Accept。晚建格（`type T` / `declare const` 的族在第二格才判出来、
// `interface I { }` ⏎ `const a = 1;` 的 `const`）搬多少单元由 `BuildByIndex` 的起点同步决定。
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

与 `ComputeByIndex` 同一口径（同一个 `Decide` 判据 + 晚建格一律可建），否则「可建」与「接受」两处判据会分叉。

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableControlFlowShell) {
  return false;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
return StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellDeclarationFamily;
```
