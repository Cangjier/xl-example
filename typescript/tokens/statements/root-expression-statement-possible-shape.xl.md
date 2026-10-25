# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DirectBuildRouter } from "../direct/direct-build-router.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementBoundaryUtil } from "./statement-boundary-util.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementOperatorBody } from "./statement-operator-body.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
```

# namespace cangjie

# class RootExpressionStatementPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!StatementRouteUtil.EnableShellExpressions) {
  return ShapeStates.Reject;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  // 首代码单元还没到（只有 trivia）：不能 Reject——CatalogGuide 会把 Reject 的候选永久删除，
  // 文件以注释开头时整条语句就没人接管了（token-ast 28 个 crash 的根因）。
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  // 等第一个代码单元真的到齐再建壳，壳里只搬代码单元（与 VariableStatementPossibleShape 同口径）。
  return ShapeStates.Uncertain;
}
// 首选**首代码单元那一格** Accept：建壳之后本条目已经归壳，后续格子若再 Accept，会与根终结候选在
// 收口那一格同时成立（CatalogGuide 抛「终结候选与其它候选同时成立」）。Reject 永久但 Reset 会复原，
// 下一条语句重新参与。
if (tokenIndex === headAt) {
  const headRoute = StatementRouteUtil.Decide(units, tokenIndex);
  // `None` = 族还没判出（第二个代码单元还没到，`import` 就是第一个例子）：只能继续等。
  // 这里若 `Reject`，CatalogGuide 会把本候选永久删除，`import .` / `import (` 那一格
  // 就再没有候选能建壳——s3k2 定位到的首格死锁。安全回退不变：真判成 `Legacy` 时照旧 `Reject`。
  if (headRoute === StatementRoute.None) {
    return ShapeStates.Uncertain;
  }
  if (headRoute !== StatementRoute.ShellPlainExpression) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
// **头格被上一条语句吞掉时的补建**（r3 根因）：上一条语句的壳在 ASI 边界收口时，边界那一格正是本条语句的
// 首代码单元（`let a = 1` ⏎ `f();` 的 `f`），它已经被交给上一条语句的壳、由 `FinishShell` 搬回父单元，
// 根目录**从未在头格求值**；到下一格（`(`）再求值时 `tokenIndex > headAt`，若照旧 Reject，本条永远拿不到壳，
// 只能等 EOF 的 legacy 兜底 → 「表达式语句没有读完」/ missing-end / 结构差。
// 补建只在「本条条目还收不了口」的格上做：
//   * `CanEndStatement` 为真（`;` / EOF / ASI 边界）→ 不补建：那一格上要收的是**上一条**语句，
//     两候选同格 Accept 会撞 CatalogGuide，而且这一格与后面的单元不属于本条语句；
//   * 其余格（表达式中间）→ 补建，把 `[start..tokenIndex]` 一起搬进壳（与 import 声明「壳晚建」同一手法）。
const lateOwner = units[tokenIndex].Parent;
const lateEnd = units[tokenIndex].SourceRange.EndIndex;
const lateAtEof = (lateOwner !== null && lateOwner.SourceRange.EndIndex >= 0)
  || (lateEnd >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, lateEnd) === "");
if (StatementBoundaryUtil.CanEndStatement(units, tokenIndex, lateAtEof)) {
  return ShapeStates.Reject;
}
const lateRoute = StatementRouteUtil.Decide(units, tokenIndex);
if (lateRoute === StatementRoute.None) {
  return ShapeStates.Uncertain;
}
if (lateRoute !== StatementRoute.ShellPlainExpression) {
  return ShapeStates.Reject;
}
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
return StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellPlainExpression;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("表达式语句候选没有可搬的单元");
}
let pos = 0;
if (host instanceof Bracket && (host as Bracket).StartBracketChar === "{") {
  // 块体目录的宿主是块体 `{` 括号：块内**第一条**语句的 `pos` 是「`{` 之后第一个字符」（含前导 trivia），
  // 与 legacy `BuildBlock` 的 `base = bracket.StartIndex + 1` 同口径；后续语句仍取前一个兄弟的 `EndIndex`
  //（HANDOFF-s4b §6 D1）。
  let previous = -1;
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      previous = at;
      break;
    }
  }
  if (previous < 0) {
    if (host.SourceRange.StartIndex >= 0) {
      pos = host.SourceRange.StartIndex + 1;
    }
  } else {
    const previousEnd = host.Data[previous].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
  }
} else {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
}
const moved:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, moved.length);
const shell = new StatementShape(host.Template);
shell.Pos = pos;
shell.Kind = StatementRoute.ShellPlainExpression;
// Stage 3 S3a/S3b：表达式体状态机随壳一起建（同一条语句一个），壳每攒到一个单元就把新单元喂给它。
shell.OperatorBody = new StatementOperatorBody(shell.Template);
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
  const endShape = new StatementEndPossibleShape();
  endShape.StatementKind = StatementRoute.ShellPlainExpression;
  shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
// H3（CONTRACT §4.3）：壳挂好后立刻挂直建 session 并喂一次已有的 Data，位置在晚建壳的
// `ComputePossibleShapes` **之前**——晚建分支随后触发的 H1 只做幂等的增量 `Ingest`。
// 未注册该 kind 时 Create 返回 null（本轮 plugins 空表），直建不接管，行为与基线逐字节不变。
shell.DirectSession = DirectBuildRouter.Create(StatementRoute.ShellPlainExpression, shell, context);
if (shell.DirectSession !== null) {
  shell.DirectSession.Ingest(shell.Data, context);
}
// 晚建壳（头格被上一条语句吞掉）：已经搬进壳的 raw 单元不会再触发本条目求值，补一次
// （与 `ImportDeclarationPossibleShape` 的「壳晚建」同一手法）。
if (tokenIndex > start) {
  shell.ComputePossibleShapes(context);
}
return shell;
```
