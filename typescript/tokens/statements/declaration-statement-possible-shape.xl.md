# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
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
一起搬进新壳的问题改由 `BuildByIndex` 的**起点同步**解决（声明族且这一格已是一条新声明语句的起点时，
搬单元的起点收到 `tokenIndex`，已闭合的壳留在原处）。判据是声明壳自己的收口边界
`StatementBoundaryUtil.IsDeclarationFollowBoundary`（Stage 4af-a 从 `CanEndStatementAt` 改来：
后者的 `IsLateAtEof` 半边会把「声明自己的尾巴恰好是全文最后单元」误判成上一句已收口，
`export { c }` / `import "x"` 因此只剩括号进壳；详见 `control-flow-statement-possible-shape.xl.md`）。

**Stage 5d-8a 的一格例外**：晚建格若落在**还没闭合的括号**上（`import {` / `export {`），先 `Uncertain`
等它闭合——见 `LateOnUnclosedBracket`。这一格不是「边界格」而是「半成品单元格」，壳在那一刻搬走括号
就再没有第二次机会。

## static method LateOnUnclosedBracket:(units:Array<Token>, tokenIndex:int)=>bool

**晚建格落在「还没闭合的括号」上时先等一格**（Stage 5d-8a）。

声明族的族要到**第二个代码单元**才判得出来（`import {` / `export {` / `interface I` 都是这种形态），
所以 `BuildByIndex` 只能在那个格子补建，搬的是 `[start..tokenIndex]`。如果那个格子恰好是**刚创建、
还没闭合的 `{`**（`import {` 的导入列表 / `export {` 的导出列表），搬进壳的就是一个**半成品括号单元**：

- 括号是在宿主目录上创建时被 `Bracket.OnBracketCreatedEvent` 反过来问一次宿主目录的（`bracket.xl.md`
  「落到 `}` 时再求值」那一格），此刻它 `Closed == false`、`Data` 还是空的；
- 壳把它搬走之后，括号再没有机会被宿主目录看见，闭合时的 `Bracket.Close()` 问的是**壳自己的**目录
  （`CatalogGuide([], endShape)`），而壳的终结判据认不出一条「导入 / 导出列表刚闭合」——于是壳一直
  挂着到块体 `}`，`BuildFromShell` 读到整段 → 抛错 → `DetachShell` → 整段体 raw
  （5d-6 §5 的 `import` 族 3 条 + `export {` 那几条）。

**为什么等一格是对的**：这个括号闭合时，`Bracket.Close()` 会问一次宿主目录（`Close` 的第一件事），
那时 `tokenIndex` 就是这个**已闭合**的括号，搬进壳的是一个完整单元——根层 `import { a } from "m";`
一直是这么建的（根层不早问目录，所以从来只在闭合后补建）。本判据只把同一个时点搬到块体目录上，
**不改任何收口判据**。

**只对「晚建格」成立**：首格（`tokenIndex === headAt`）不是括号，不可能命中。

```ts
const start = ItemUtil.ItemStart(units);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || tokenIndex <= headAt) {
  return false;
}
const unit = units[tokenIndex];
return unit instanceof Bracket && !(unit as Bracket).Closed;
```

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
if (DeclarationStatementPossibleShape.LateOnUnclosedBracket(units, tokenIndex)) {
  // **Stage 5d-8a**：晚建格是还没闭合的 `{`（`import {` / `export {`）→ 继续等它闭合，
  // 闭合时 `Bracket.Close()` 会回来问一次宿主目录（见上面的说明）。这里**不能 Reject**：
  // Reject 被 `CatalogGuide` 永久删除，闭合那一格就再没有候选能建壳了。
  return ShapeStates.Uncertain;
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
  //
  // **Stage 5d-9a**：`None` 还有第二种含义——「首两格已经到齐、并且已经判出来本族不管这一格」
  //（`type` ⏎ `T = 1` 里 `type` 是标识符，TS 给两条 ExpressionStatement）。那一种继续等下去，
  // 会在名字那一格与 `SourceFileEndPossibleShape` 的 ASI 边界同时成立 → CatalogGuide 抛
  // 「终结候选与其它候选同时成立」→ 整条文件 fallback。所以那一格必须 Reject（本族对这条语句
  // 确实没有归属）。两处读同一份判据：`StatementRouteUtil.DeclinesDeclarationHead`。
  if (StatementRouteUtil.DeclinesDeclarationHead(units)) {
    return ShapeStates.Reject;
  }
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

与 `ComputeByIndex` 同一口径（同一个 `Decide` 判据；晚建格除「括号还没闭合」那一格之外一律可建），
否则「可建」与「接受」两处判据会分叉。

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableControlFlowShell) {
  return false;
}
if (DeclarationStatementPossibleShape.LateOnUnclosedBracket(units, tokenIndex)) {
  // 与 `ComputeByIndex` 同一条等待（否则「接受」= Uncertain 而「可建」= true，两处判据分叉）。
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
