# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ControlFlowStatementPossibleShape } from "./control-flow-statement-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { ImportExportDeclarationMount } from "../declarations/forms/import-export-declaration-mount.xl.md"
import { InterfaceDeclarationMount } from "../declarations/forms/interface-declaration-mount.xl.md"
import { TypeAliasDeclarationMount } from "../declarations/forms/type-alias-declaration-mount.xl.md"
```

# namespace cangjie

# class DeclarationStatementPossibleShape extends ControlFlowStatementPossibleShape

## static method LateOnUnclosedBracket:(units:Array<Token>, tokenIndex:int)=>bool

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
// [XL-B3c] WP-B3c（在 B5/B4a 段之后追加、不重排）：incremental 模式下 enum / namespace / module
// 三个声明族改由各自的 `EnumDeclarationPossibleShape` / `ModuleDeclarationPossibleShape` 提前挂壳，
// 本通用声明壳让位（否则它与声明族候选同格 Accept = 永远等不到唯一候选）。
// false 时本段整体不执行 —— legacy 路径逐字节不变。
if (StatementRouteUtil.IsIncrementalShapesEnabled()) {
  const b3cHeadText = units[headAt] instanceof Common ? (units[headAt] as Common).TempToString() : "";
  if (b3cHeadText === "enum" || b3cHeadText === "namespace" || b3cHeadText === "module") {
    return ShapeStates.Reject;
  }
  // [XL-B3f] WP-B3f：`declare function` / `declare namespace|module|global` 也由族候选提前挂壳：
  // 首词 `declare` 时看第二个代码单元，命中族头就 Reject（只在第二格起判，head 格仍 Accept，
  // 好让族候选先挂壳）。`declare const|let|var` 不在本段（属变量三层，B3f 未接管）。
  if (b3cHeadText === "declare") {
    const b3fSecondAt = ItemUtil.NextCode(units, headAt + 1);
    if (b3fSecondAt >= 0 && b3fSecondAt < units.length && b3fSecondAt <= tokenIndex) {
      const b3fSecondText = units[b3fSecondAt] instanceof Common
        ? (units[b3fSecondAt] as Common).TempToString() : "";
      if (b3fSecondText === "namespace"
        || b3fSecondText === "module" || b3fSecondText === "global") {
        return ShapeStates.Reject;
      }
    }
  }
}
// 首格与晚建格一视同仁：都 Accept。晚建格（`type T` / `declare const` 的族在第二格才判出来、
// `interface I { }` ⏎ `const a = 1;` 的 `const`）搬多少单元由 `BuildByIndex` 的起点同步决定。
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

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

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// [XL-B5] WP-B5 的**唯一接线点**：增量模式（`IsIncrementalShapesEnabled()`）下，import / export 声明族
// 不再先建 `StatementShape` 声明壳再在收口时整段建树，而是由 `ImportExportDeclarationMount` 直接挂族形状、
// 逐单元喂它自己的 `CatalogGuide`。开关 false（默认）时 `TryBuild` 第一步就返回 `null`，
// 这里逐字落回 `super.BuildByIndex` ⇒ legacy 路径一个字节都不变。
// 未接管的形态（`export declare const` / `export default function` / `export class` …）同样返回 `null`，
// 仍走既有声明壳（那是 B3/B4 的写域）。
const mounted = ImportExportDeclarationMount.TryBuild(host, tokenIndex, context);
if (mounted !== null) {
  return mounted;
}
// [XL-B4a] WP-B4a：interface / type alias 声明族的**尽早挂壳**（在 B5 段之后追加，不重排上面的接线）。
// 两个入口都自带 `IsIncrementalShapesEnabled()` 门控 + 根层 + 声明头判据；未命中返回 `null`，
// 逐字落回 `super.BuildByIndex`（既有声明壳），因此 legacy 路径与未接管形态一个字节都不变。
const declaredInterface = InterfaceDeclarationMount.TryBuild(host, tokenIndex, context);
if (declaredInterface !== null) {
  return declaredInterface;
}
const aliasPlaceholder = TypeAliasDeclarationMount.ShouldMount(host, tokenIndex);
const built = super.BuildByIndex(host, tokenIndex, catalog, context);
if (aliasPlaceholder) {
  // type 别名没有括号那样的显式收口触发点，故用占位节点（类名/Pos 同 legacy 最终节点、IsTriviaToken=true），
  // 收口仍走既有语句壳；壳被 legacy 子树替换时占位随之离开（EOF 树 = legacy 树）。
  TypeAliasDeclarationMount.AttachPlaceholder(built, context);
}
return built;
```
