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

**根层声明 / 导入导出族的专用起点候选**（Stage 4r）。

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

**让位门控**：9 个 legacy 声明候选（Import / Export / ImportEquals / ExportAssignment / NamespaceExport /
Class / Interface / Function / Enum / Module / TypeAlias）在 `ComputeByIndex` 顶部对
`Decide === ShellDeclarationFamily` 主动 `Reject`——否则它们与本候选同格 Accept，`CatalogGuide` 会一直等
（"接受"与"不确定"同义，只有只剩一个候选才建）。`EnableDeclarationShell=false` 时 `Decide` 重新返回
`Legacy`，门控整体失效，行为逐位回到 Stage 4p。

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
// route 判成声明族之后，首格与晚一两格的补建都走同一条建壳路径。
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

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
