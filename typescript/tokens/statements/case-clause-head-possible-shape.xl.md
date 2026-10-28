# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
import { StatementShellCatalog } from "./statement-shell-catalog.xl.md"
```

# namespace cangjie

# class CaseClauseHeadPossibleShape extends PossibleShape

```txt
switch (a) { case 1: b; }
switch (a) { case a ? b : c: d; }
switch (a) { default: e; }
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableSwitchCaseClause
  || !StatementRouteUtil.EnableSwitchCaseClauseHead) {
  return ShapeStates.Reject;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  // 括号里的 Data 不会有 EOF；真到了也等，不在这里判死（Reject 是永久删除）。
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
// 首代码单元还没到（只有 trivia）：不能 Reject——`CatalogGuide` 会把 Reject 的候选永久删除。
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return ShapeStates.Uncertain;
}
const route = StatementRouteUtil.Decide(units, tokenIndex);
if (route !== StatementRoute.ShellCaseClauseHead) {
  // 这一格不是子句头（子句语句 / 子句体 `{` / 别的族）：**必须 `Reject`**，不能 `Uncertain`——
  // 子句语句候选在同一格答 `Accept`，两个候选同时活着时 `CatalogGuide` 永远等不到「唯一候选」，
  // 整条子句一条壳都建不出来（`switch (a) { case 1: let y = 1; }` 的 `let` 就是这样卡住的：
  // `Decide` 在绑定单元还没到时返回 `None`）。
  return ShapeStates.Reject;
}
// 只在**首代码单元**那一格 Accept：建壳之后本条目归壳，冒号由壳的终结候选判界。
if (tokenIndex !== headAt) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableSwitchCaseClause
  || !StatementRouteUtil.EnableSwitchCaseClauseHead) {
  return false;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return false;
}
return tokenIndex === headAt
  && StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellCaseClauseHead;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
let start = ItemUtil.ItemStart(host.Data);
if (start < 0 || start > tokenIndex) {
  throw new Error("case 子句头候选没有可搬的单元");
}
let pos = 0;
let hasPrevious = false;
for (let at = start - 1; at >= 0; at--) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  hasPrevious = true;
  const previousEnd = host.Data[at].SourceRange.EndIndex;
  if (previousEnd >= 0) {
    pos = previousEnd;
  }
  break;
}
if (!hasPrevious) {
  // 与 legacy `BuildCaseBlock` 的 `inner.Load(bracket.Data, base)` 同口径：括号自己不在 `Data` 里，
  // 所以**第一条子句**的 `Pos` 不是「前一个单元的 End」，而是 `{` 之后第一个字符。
  // 少了这一条，`case` 的 `pos` 会落到 0（`switch (a) { case 1: …` 的 `CaseClause[0]` 差 12 格）。
  if (host.SourceRange.StartIndex >= 0) {
    pos = host.SourceRange.StartIndex + 1;
  }
}
const moved:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, moved.length);
const shell = new StatementShape(host.Template);
shell.Pos = pos;
// `Kind` 与终结候选的 `StatementKind` 都取本族：收口判据走
// `StatementEndPossibleShape.ClauseHeadEndCode`（三元深度 0 的 `:` / `default:` 的冒号），
// 建树走 `StatementFamilyDispatch.BuildByHead` → `StatementBuilder.BuildCaseClauseHead`。
shell.Kind = StatementRoute.ShellCaseClauseHead;
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
const endShape = new StatementEndPossibleShape();
endShape.StatementKind = StatementRoute.ShellCaseClauseHead;
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
StatementRouteUtil.SwitchCaseClauseHeadShellCount += 1;
// [XL-ROUTE:clause-head] 与控制流壳同一手法：增量总闸打开时先挂「早期占位节点」
// （`CaseClauseShape` / `DefaultClauseShape`，类名与 legacy 相同、`Pos` = 壳 `Pos`），
// 收口时由 `StatementFamilyDispatch.Build` → `StatementShellCatalog.Take` 把 legacy 子树搬进去。
// 于是 `CaseClauseShape` 的首见格 = `case` 关键字格，而 EOF 树与 legacy 逐节点一致。
if (StatementRouteUtil.IsIncrementalShapesEnabled()) {
  let headUnit:Token | null = null;
  for (const item of moved) {
    if (!item.IsTriviaToken) {
      headUnit = item;
      break;
    }
  }
  if (headUnit !== null) {
    StatementShellCatalog.Attach(shell, headUnit, StatementRoute.ShellCaseClauseHead);
  }
}
return shell;
```
