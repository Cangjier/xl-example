# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
```

# namespace cangjie

# class RootExpressionStatementPossibleShape extends PossibleShape

**普通表达式语句的根起点候选**（Stage 1 T1d，设计 §3.3）：只接 `StatementRoute.ShellPlainExpression` 起点
（标识符 / 字面量 / `(` / `[` / 一元前缀符号），在首代码单元到齐时就建 `StatementShape` 壳、把已经攒下的 raw
单元搬进壳、`host.MountedUnit = 壳`；语句怎么结束、怎么建树全部下放给壳自己的终结候选
（`StatementEndPossibleShape` → `StatementShape.BuildFromShell` + `FinishShell`）。

**互斥**（不靠先后）：legacy `ExpressionStatementPossibleShape.ComputeByIndex` 顶部对同一判据（`Decide ===
ShellPlainExpression`）主动 `Reject`，本候选只对 `ShellPlainExpression` `Accept`，两边永不同格成立。

**不做的事**：不换 legacy 表达式语句的状态机、不碰块内路径（块内走 `ExpressionEnd` / `IsAsiBoundary`）；
增量表达式（操作符候选）是 Stage 3，本候选只做「原子建壳 + 交给 builder」的整段建树。

只覆盖根层：本候选只注册进 `SourceFileShape` 的根目录。

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
const start = ItemUtil.ItemStart(units);
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
// 只在**首代码单元那一格** Accept：建壳之后本条目已经归壳，后续格子若再 Accept，会与根终结候选在
// 收口那一格同时成立（CatalogGuide 抛「终结候选与其它候选同时成立」）。Reject 永久但 Reset 会复原，
// 下一条语句重新参与。
if (tokenIndex !== headAt) {
  return ShapeStates.Reject;
}
if (StatementRouteUtil.Decide(units, tokenIndex) !== StatementRoute.ShellPlainExpression) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

首代码单元到齐即可建壳；建壳之后由 `StatementEndPossibleShape` 收口。

```ts
const start = ItemUtil.ItemStart(units);
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

与 `VariableStatementPossibleShape.BuildByIndex` **逐字同构**：搬 raw 单元、`Pos` 取「前一个非 trivia 单元
`EndIndex`」、原位插回壳、`Parent` / `MountedUnit` 显式设置、壳的终结候选是 `StatementEndPossibleShape`。
唯一不同：`Kind = StatementRoute.ShellPlainExpression`（表达式语句族，供壳内目录与 Stage 3 分流读取）。

```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("表达式语句候选没有可搬的单元");
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
const moved:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, moved.length);
const shell = new StatementShape(host.Template);
shell.Pos = pos;
shell.Kind = StatementRoute.ShellPlainExpression;
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
return shell;
```
