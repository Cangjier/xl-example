# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
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
```

# namespace cangjie

# class CaseClauseStatementPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableSwitchCaseClause) {
  return ShapeStates.Reject;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  // 括号里的 Data 不会有 EOF；真到了也等，不在这里判死（Reject 是永久删除）。
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
// **[WP-S1] 让位给同目录的子句头候选**。`case <表达式> :` / `default :` 的**冒号之前**由
// `CaseClauseHeadPossibleShape` 接管，本候选在那里必须**永久 `Reject`**（不是 `Uncertain`）：
// 两个候选同时活着时 `CatalogGuide` 永远等不到「唯一候选」，`case` 一条壳都建不出来；
// 而 `Reject` 只影响本条目，建完一条形状后 `Reset()` 会把候选全部放回。
// 判据不新写：`StatementRouteUtil.Decide` 是 `case` / `default` 起语句的唯一判据。
if (StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellCaseClauseHead) {
  return ShapeStates.Reject;
}
if (!CaseClauseStatementPossibleShape.IsClauseStatementStart(units, tokenIndex)) {
  return ShapeStates.Uncertain;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableSwitchCaseClause) {
  return false;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
return CaseClauseStatementPossibleShape.IsClauseStatementStart(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const start = tokenIndex;
if (start < 0 || start >= host.Data.length) {
  throw new Error("case 子句语句候选没有可搬的单元");
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  const previousEnd = host.Data[at].SourceRange.EndIndex;
  if (previousEnd >= 0) {
    pos = previousEnd;
  }
  break;
}
const moved:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, moved.length);
// **Stage 4ae：按子句语句的首代码单元分族**。以带体关键字（if / for / while / do / try / with /
// class / function）开头的子句语句，边界是**闭合的 `}`**（`do … while (…) ;` 是 `;`），不是表达式语句
// 那一套 `;` / EOF / ASI：壳若继续用 `ShellPlainExpression` 的终结候选，`if (x) { y; }` 永远不会在
// `}` 处收口，壳会吞掉下一条语句 `b;`（HANDOFF-s4ac §2.1 的 gap ①）。这一族改用控制流族标记
// （Kind 与终结候选都取 `ShellStatementFamily`），判界走 legacy 的 `StatementScanner.ScanRoot`，
// 建树仍是同一个 `StatementBuilder.BuildStatement`；体括号由 `StatementShape.OnBracketCreatedEvent`
// → `BlockPossibleShape.TryMountControlFlowBody` 挂块体目录（与 `if (a) { … }` 在块内完全同一条通道）。
const statementFamily = moved.length > 0
  && CaseClauseStatementPossibleShape.IsStatementFamilyHead(moved[0]);
const shell = new StatementShape(host.Template);
shell.Pos = pos;
if (statementFamily) {
  shell.Kind = StatementRoute.ShellStatementFamily;
} else {
  // 其余子句语句仍是表达式语句那一套：`Kind = ShellBlock` + `BodyKind = BodyKindBlock`，
  // 终结候选 `StatementKind = ShellPlainExpression`（`;` / EOF / ASI）。这是 Stage 4aa 验证过的组合。
  shell.Kind = StatementRoute.ShellBlock;
  shell.BodyKind = StatementShape.BodyKindBlock;
}
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
const endShape = new StatementEndPossibleShape();
// Stage 4aa 根因：壳里是**没有 `{` 前缀的 raw 子句单元**。`StatementKind = 0`（Wave1 变量族）让终结
// 候选走 `StatementScanner.ScanRoot`，而 `ScanRoot` 只认 `{` / `;` / 声明关键字起点（`f` 起头一律
// `Mismatch`，`statement-scanner.xl.md:167-309`），所以壳在 `;` 处不收口、一直涨到 case 块的 `}`，
// `ExitOrPre` 整体建树失败 → `DetachShell` 退回 raw（树正确、接管归零，正是 S4y 的症状）。
// 块壳（`BlockPossibleShape`）同样是 `StatementKind = 0`，但它的 `Data` 以 `{` 开头，`ScanRoot` 在
// 第一个单元就 `Complete`，「块壳靠 `ScanRoot` 收口」并不能推广到子句壳。子句语句真正的收口规则是
// 表达式语句那一套（`;` / EOF / ASI），所以族标记必须是 `ShellPlainExpression`
// （走 `StatementEndPossibleShape.ExpressionEndCode`，与 `RootExpressionStatementPossibleShape` 同源）。
// **Stage 4ae**：带体关键字族例外——它的边界是 `}`，必须走 `ScanRoot`（与 legacy `if` / `try` /
// `class` 同一条判界），否则 `if (x) { y; }` 不在 `}` 收口、壳吞掉下一条语句（gap ①）。
endShape.StatementKind = statementFamily
  ? StatementRoute.ShellStatementFamily
  : StatementRoute.ShellPlainExpression;
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
StatementRouteUtil.SwitchCaseClauseShellCount += 1;
return shell;
```

## static method IsStatementFamilyHead:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
return text === "if" || text === "for" || text === "while" || text === "do"
  || text === "try" || text === "with" || text === "class" || text === "function"
  || text === "switch";
```

## static method IsClauseStatementStart:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex <= 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || !unit.IsBasicToken) {
  return false;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
  // case 体 `{ … }` 由 Stage 4s 的「case 体括号挂块体目录」通道负责，这里不抢。
  return false;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "case" || text === "default") {
    return false;
  }
}
let previousAt = -1;
for (let at = tokenIndex - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    previousAt = at;
    break;
  }
}
if (previousAt < 0) {
  return false;
}
return CaseClauseStatementPossibleShape.IsInsideClause(units, previousAt);
```

## static method IsInsideClause:(units:Array<Token>, at:int)=>bool

```ts
for (let cursor = at; cursor >= 0; cursor--) {
  const item = units[cursor];
  if (item.IsTriviaToken) {
    continue;
  }
  const name = item.constructor.name;
  if (name === "CaseClauseShape" || name === "DefaultClauseShape") {
    return true;
  }
  if (item instanceof Common) {
    const text = (item as Common).TempToString();
    if (text === "case" || text === "default") {
      const colonAt = CaseClauseStatementPossibleShape.ClauseColonAt(units, cursor + 1);
      return colonAt >= 0 && colonAt <= at;
    }
  }
}
return false;
```

## static method ClauseColonAt:(units:Array<Token>, from:int)=>int

```ts
let ternaryDepth = 0;
for (let at = from; at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "?") {
    ternaryDepth++;
    continue;
  }
  if (text === ":") {
    if (ternaryDepth > 0) {
      ternaryDepth--;
      continue;
    }
    return at;
  }
}
return -1;
```
