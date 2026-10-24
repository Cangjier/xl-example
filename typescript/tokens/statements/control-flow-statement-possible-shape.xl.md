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
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
```

# namespace cangjie

# class ControlFlowStatementPossibleShape extends PossibleShape

**控制流 / 声明族语句的通用起点候选**（Stage 4c，设计 §4「其余语句族壳化」）。

它只做一件事：本条目第一个代码单元是 `StatementRouteUtil.Decide` 判出的
`StatementRoute.ShellStatementFamily` 起点时 `Accept`，建一个 `StatementShape` 壳、把已经攒下的 raw 单元
搬进壳、`host.MountedUnit = 壳`。语句怎么结束、怎么建树全部下放给壳自己的终结候选
（`StatementEndPossibleShape`，`StatementKind = ShellStatementFamily` → 沿用 legacy 的
`StatementScanner.ScanRoot` 判界）与 `StatementShape.BuildFromShell`（`StatementBuilder.BuildStatement`
原子建树，与 legacy `StatementPossibleShape.BuildByIndex` 同一份建造器、同一段 raw 单元）。

**覆盖的起点**（全部由 `Decide` 一处裁决，本候选不写第二份判据）：

- 关键字族：`if` / `while` / `do` / `for`（含 `for-in` / `for-of`）/ `switch` / `try` /
  `return` / `throw` / `break` / `continue` / `debugger` / `with`；
- 空语句：语句首的 `;`（**默认开**，`EnableControlFlowEmpty = true`；4d 的 `FinishShell` 父目录重放
  修好了「重放回来的 `;` 因旧 `ItemStart` 失管」，legacy 与壳建空语句仍是同一份 `BuildEmpty`）。
  历史读数（4c-2 默认关）保留在 `HANDOFF-s4d.md` §3 与 `statement-route-util.xl.md`。

**标签语句**（`EnableControlFlowLabel`，**默认关**；4c-2 的注释写成「默认打开」与默认值不符，4d 修 F1）：路由 `ShellLabel` 与 `ShellStatementFamily`
是**同一个候选**的两条入口，只有建壳时机不同——标签头是标识符，`Decide` 在首格返回 `None`（等第二个代码
单元），`:` 到达那一格才判成 `ShellLabel`，本候选就在 `:` 格 Accept 并搬 `ident` + `:` 建壳
（`Kind = ShellLabel`），判界走 `ScanRoot`、建树走 `StatementBuilder.BuildStatement` 的标签分派。
标签体不分流：`en:\n{ f() }` 的 `{` 在标签壳里由建造器原子递归，块候选看不到它。

**不在本候选里**：`function` / `class` / `interface` / `enum` / `namespace` / `module` /
`import` / `export` / `declare` / `abstract` / `type` / `using` / 装饰器 / `async` 等声明与导入导出族
——它们仍由 `StatementPossibleShape` 与各自的 legacy 候选建，未覆盖即安全回退。

**互斥（显式分流，不靠先后）**：`Decide` 返回 `Legacy` 的所有起点由 `StatementPossibleShape` 接管，
它在 `ComputeByIndex` 顶部对「非 `Legacy` 且非 `None`」的路由主动 `Reject`；本候选只对
`ShellStatementFamily` `Accept`。两边永不同格 `Accept`。

**熔断**：`EnableShellExpressions == false`（文件级 fallback 与 harness 的 legacy 对拍都走这一档）或
`EnableControlFlowShell == false` 时，`Decide` 对这些起点重新返回 `Legacy`，本候选整体 `Reject`，
行为逐位回到 Stage 4b 之前。**未覆盖构造不建错树**：壳收口时建不出来就由
`StatementShape.DetachShell` 把 raw 单元按原位退回父单元（块内交回 `BuildBlock` 的 legacy 递归），
必要时再由 `SourceFileRunner` 的文件级 fallback 整条重解析。

**块体目录**：同一个候选也挂在块体 `{` 括号上（`BlockPossibleShape.CreateBodyPossibleShapes`），
块内的控制流语句因此同样走壳，再由 `StatementBuilder.CollectBodyStatements` 按序收集。

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
  // 首代码单元还没到（只有 trivia）：不能 Reject——CatalogGuide 会把 Reject 的候选永久删除，
  // 文件以注释开头时整条语句就没人接管了（token-ast 28 个 crash 的根因）。
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
// 族在**首代码单元**判一次（`Decide` 是唯一判据，本候选不写第二份关键字表）。
const route = StatementRouteUtil.Decide(units, tokenIndex);
if (route === StatementRoute.None) {
  // 标签候选的「`:` 还没到」：继续等。这里**不能 Reject**——Reject 被 `CatalogGuide` 永久删除，
  // `:` 到达那一格就再没有候选能建标签壳（Stage 4c 的默认关正是被这一步挡掉的）。
  return ShapeStates.Uncertain;
}
if (route === StatementRoute.ShellLabel) {
  // 标签在**第二个代码单元（`:`）那一格**建壳：`ident` 与 `:` 一起搬进壳。
  if (tokenIndex !== ItemUtil.NextCode(units, headAt + 1)) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
// 其余各族只在首代码单元那一格 Accept：建壳之后本条目归壳，后续格子由壳的终结候选判界。
if (route !== StatementRoute.ShellStatementFamily || tokenIndex !== headAt) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

首代码单元到齐即可建壳；建壳不需要等括号闭合或语句结束。

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
const route = StatementRouteUtil.Decide(units, tokenIndex);
if (route === StatementRoute.None) {
  return false;
}
if (route === StatementRoute.ShellLabel) {
  return tokenIndex === ItemUtil.NextCode(units, headAt + 1);
}
return route === StatementRoute.ShellStatementFamily && tokenIndex === headAt;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

与 `VariableStatementPossibleShape.BuildByIndex` / `BlockPossibleShape.BuildByIndex` 逐字同构：
搬 raw 单元、`Pos` 取「前一个非 trivia 单元 `EndIndex`」（宿主是块体 `{` 括号时首句取
`StartIndex + 1`，与 legacy `BuildBlock` 的 `base` 同口径）、原位插回壳、`Parent` / `MountedUnit` 显式设置、
终结候选是 `StatementEndPossibleShape` 且 `StatementKind = StatementRoute.ShellStatementFamily`
（`ComputeByIndex` 走 `ScanRoot` 分支，与 legacy 同一份判界）。

```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("控制流语句候选没有可搬的单元");
}
// 族在搬单元**之前**判：插壳之后 `ItemStart` 已经指向壳自己，再判就是另一条语句了。
const route = StatementRouteUtil.Decide(host.Data, tokenIndex);
let pos = 0;
if (host instanceof Bracket && (host as Bracket).StartBracketChar === "{") {
  // 块体目录的宿主是块体 `{` 括号：块内**第一条**语句的 `pos` 是「`{` 之后第一个字符」（含前导 trivia），
  // 与 legacy `BuildBlock` 的 `base = bracket.StartIndex + 1` 同口径；后续语句仍取前一个兄弟的 `EndIndex`。
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
shell.Kind = route;
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
const endShape = new StatementEndPossibleShape();
endShape.StatementKind = StatementRoute.ShellStatementFamily;
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
if (route === StatementRoute.ShellLabel) {
  StatementRouteUtil.LabelShellCount += 1;
} else {
  StatementRouteUtil.ControlFlowShellCount += 1;
}
return shell;
```
