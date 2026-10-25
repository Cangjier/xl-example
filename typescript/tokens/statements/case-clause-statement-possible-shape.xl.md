# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
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

**switch 子句级语句的起点候选**（Stage 4y 落地，Stage 4aa 转正）。**默认开**（唯一门控
`StatementRouteUtil.EnableSwitchCaseClause`；Stage 4ae 起 `BlockPossibleShape` 上的同名重复字段已删除）。
S4y 的「壳在 `;` 处不收口」根因是终结
候选的族标记挂错：子句壳的 `Data` 里没有 `{` 前缀，`StatementKind = 0` 会走 `StatementScanner.ScanRoot`，而它只认
`{` / `;` / 声明关键字起点；Stage 4aa 改成 `ShellPlainExpression`（`;` / EOF / ASI 判界）后 `;` 处正常收口。

`switch (x) { case 1: f(); case 2: { g(); } }` 里 `case 1:` 之后的 `f();` **不在任何括号里**：
它直接躺在 switch 的 case 块括号 `{ … }` 的 `Data` 上。Stage 4s 只给 case 体的 `{`（`case 1: { … }`）
挂了块体目录，子句级语句因此没有宿主，整段留 raw（`BuildCaseBlock` 的内层 `BuildStatement()` 建树，
树正确但未接管）。

**为什么不做「伪 Bracket 宿主」**：给子句 units 造一个只在 possible 层存在、不进树的伪括号，要求
`Bracket.Transit` 的字符路由把后续单元送进这个凭空插进去的括号，还要在 `BuildCaseBlock` 里把它摘掉；
4s 已经证明「形状的宿主假设挂错一格」会直接抛 `SourceRange is not set`。本候选改用**已有的宿主**：
switch 的 **case 块括号**本身就是这些子句语句的宿主，只要它的目录里放的不是块体目录（表达式 / 变量
候选会把 `case 1:` 整套当一条语句建壳，4p 的抛错正是这么来的），而只放本候选——它只在
「某个子句的冒号之后」`Accept`，在 `case` / 表达式 / 冒号格上全部 `Uncertain`。

**为什么不 `Reject` 非起点格**：`CatalogGuide` 把 `Reject` 的候选**永久删除**，而这个目录里只有本候选。
在 `case`、case 表达式、冒号那些格上判死，目录的 `Candidates` 会变空并从此停摆，后面整段子句再没有人
接管（块体目录经得起删除是因为它有 6 个候选）。`Uncertain` 让候选一直活着，只在真正的起点建壳。

**建壳 / 收口 / 建树全部复用既有机制**：壳 `Kind = ShellBlock` + `BodyKind = BodyKindBlock`、终结候选
`StatementEndPossibleShape` 且 `StatementKind = ShellPlainExpression`（Stage 4aa 修复，见 `BuildByIndex`
的注释：壳里没有 `{` 前缀，`StatementKind = 0` 的 `ScanRoot` 对 `f` 起头的子句语句一律 `Mismatch`，
壳在 `;` 处不收口；子句语句的收口规则是表达式语句那一套 `;` / EOF / ASI）；收口时 `StatementShape.BuildFromShell` 用**同一段 raw 单元**
调用**同一个** `StatementBuilder.BuildStatement()`。`Pos` 取「前一个非 trivia 单元的 `EndIndex`」
（子句第一个语句 = 冒号末尾，后续语句 = 上一条语句末尾），与 `BuildCaseBlock` 里
`inner.Load(bracket.Data, base)` 之后 `this.Positions[first]` 的口径逐位相同。

**子句边界判据**（`IsClauseStatementStart`）：只读宿主 `Data`，不建状态、不调 `Decide`：

1. 当前单元必须是 basic token、不是 trivia、不是 `{` 括号（case 体走 4s 的既有通道）、不是
   `case` / `default` 关键字；
2. 前一个非 trivia 单元是 `:`（子句第一条语句）或已经是**已建语句形状** / `;`（同一子句的后续语句）；
3. 从当前位置往回找最近的 `case` / `default` 关键字，按 `BuildCaseBlock` **同一份**三元深度算法定位
   该子句的冒号：`case` 分支取「`?` 深度 0 的第一个 `:`」，`default` 分支要求紧随其后的代码单元就是 `:`；
   冒号必须正好是第 2 条里的那个 `:`（第一条语句）或位于它之前（后续语句）。

第 3 条把 `case a ? b : c:` 的三元冒号排除在外（`b` / `c` 前面那个 `:` 不是子句冒号）；`case` 体
`{ … }` 由第 1 条排除；`: ` 之后的 `{` 也由第 1 条挡住，行为逐位回到 Stage 4s。

**安全回退**：`EnableSwitchCaseClause = false` 时整体 `Reject`，目录里一个候选都不剩但终结候选
（`BlockBodyWaitingPossibleShape`）在场，只返回 `Waiting`、不抛错；没有任何形状被建出，
`BuildCaseBlock` 的 raw 路径逐位回到 Stage 4s。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

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
if (!CaseClauseStatementPossibleShape.IsClauseStatementStart(units, tokenIndex)) {
  return ShapeStates.Uncertain;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

与 `ComputeByIndex` 同一份判据（`IsClauseStatementStart`），否则「接受」与「可建」两处会分叉。

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

与 `BlockPossibleShape.BuildByIndex` 同构，只有两处不同：

- **搬的起点是 `tokenIndex` 自己**，不是 `ItemUtil.ItemStart`：宿主是 case 块括号，`ItemStart` 指向
  `case` 关键字（整段子句的起点），照搬会把 `case 1:` 一起搬进壳；
- `Pos` 取前一个**非 trivia** 单元的 `EndIndex`（子句第一个语句取冒号末尾，后续语句取上一条语句末尾）。

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

**Stage 4ae：子句语句的「带体关键字」族判据**。只认首代码单元是 `Common` 且文本属于
`if` / `for` / `while` / `do` / `try` / `with` / `class` / `function` / `switch`。这些语句的边界是闭合的
`}`（`do … while (…) ;` 是 `;`），必须由 `StatementScanner.ScanRoot` 判界；其余子句语句（表达式 / 变量 /
`return` / `throw` 等）仍用表达式语句的 `;` / EOF / ASI。

**`switch` 为什么在集合里（gap-SW §2）**：Stage 4ae 曾把它排除，理由是「打开嵌套 switch 会改变既有
stage4y 读数」；但把它留在表达式族是**错的**——`switch (y) { … }` 的边界是 `}`，表达式族的 `;` / ASI 判界
在 `case 1: switch (y) {` 这一格根本收不住，壳会把内层整段吞进来。反过来，判成 `ShellStatementFamily` 之后：

- 外层子句壳的 `Kind === ShellStatementFamily` 且首代码单元是 `switch` →
  `BlockPossibleShape.IsSwitchKeywordShell` 成立 → 内层 case 块括号**挂上子句目录** → 内层子句语句
  （`case 2: f();`）也建壳，`SwitchCaseClauseShellCount` 从 1 变 2，`SwitchCaseClauseMountCount` 从 1 变 2；
- 判界走 `ScanRoot` 的 `ScanLoop`（`switch` 与 `while` 同一条，见 `statement-scanner.xl.md:903-915`）：
  内层体括号闭合即 `Complete`，外层子句壳在内层 `}` 处收口，不多吞一个单元。

`class` / `function` 与 `switch` 同族，但它们的**声明体**起点 `ScanRoot` 不认（legacy 声明族的起点），
所以终结候选另有一条 `StatementEndPossibleShape.DeclarationBodyEndCode`（gap-SW §3/§4）兜住收口位置。

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

子句语句起点判据（只读 `units`）：

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
const previous = units[previousAt];
const previousIsColon = previous instanceof Symbol && (previous as Symbol).Is(":");
let afterStatement = false;
if (previous instanceof Symbol && (previous as Symbol).Is(";")) {
  afterStatement = true;
} else if (!previous.IsBasicToken) {
  // 同一子句里上一条语句已经被建成形状（`;` 被消费进那条语句）。
  afterStatement = true;
}
if (!previousIsColon && !afterStatement) {
  return false;
}
// 最近的 case / default 关键字（括号是原子单元，子句表达式里的关键字进不到这一层）。
let keywordAt = -1;
let keywordText = "";
for (let at = previousAt; at >= 0; at--) {
  const item = units[at];
  if (!(item instanceof Common)) {
    continue;
  }
  const text = (item as Common).TempToString();
  if (text === "case" || text === "default") {
    keywordAt = at;
    keywordText = text;
    break;
  }
}
if (keywordAt < 0) {
  return false;
}
let colonAt = -1;
if (keywordText === "default") {
  const afterDefault = ItemUtil.NextCode(units, keywordAt + 1);
  if (afterDefault >= units.length) {
    return false;
  }
  if (!(units[afterDefault] instanceof Symbol) || !(units[afterDefault] as Symbol).Is(":")) {
    return false;
  }
  colonAt = afterDefault;
} else {
  // 与 `StatementBuilder.BuildCaseBlock` 同一份冒号判据：三元 `?` 深度 0 的第一个 `:`。
  let ternaryDepth = 0;
  for (let at = keywordAt + 1; at < units.length; at++) {
    const item = units[at];
    if (!(item instanceof Symbol)) {
      continue;
    }
    if ((item as Symbol).Is("?")) {
      ternaryDepth++;
      continue;
    }
    if ((item as Symbol).Is(":")) {
      if (ternaryDepth > 0) {
        ternaryDepth--;
        continue;
      }
      colonAt = at;
      break;
    }
  }
  if (colonAt < 0) {
    return false;
  }
}
if (previousIsColon) {
  return previousAt === colonAt;
}
return previousAt > colonAt;
```
