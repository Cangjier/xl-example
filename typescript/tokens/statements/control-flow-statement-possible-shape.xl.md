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
import { StatementBoundaryUtil } from "./statement-boundary-util.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
```

# namespace cangjie

# class ControlFlowStatementPossibleShape extends PossibleShape

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
  // **Stage 4f：标签在首格建壳**（`Decide` 用文档前瞻在首格就判出了 `ShellLabel`），先把 `ident` 搬进壳，
  // `:` 与标签体作为后续普通单元喂给壳；`:` 那一格仍保留 Accept 作为兼容通道（旧路径/延迟到达）。
  if (tokenIndex === headAt) {
    return ShapeStates.Accept;
  }
  if (tokenIndex !== ItemUtil.NextCode(units, headAt + 1)) {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
// 其余各族只在首代码单元那一格 Accept：建壳之后本条目归壳，后续格子由壳的终结候选判界。
// Stage 4q：声明 / 导入导出族（`ShellDeclarationFamily`）走同一个候选、同一条建壳路径。
// **Stage 5d-3**：根层 `function` / `class` / 装饰器声明（`ShellFunctionDeclaration` /
// `ShellClassDeclaration` / `ShellDecoratedDeclaration`）也走这一条——它们各有自己的终结判据
// （`StatementBoundaryUtil.DeclarationShellEndCode`）与 family builder，候选只负责建壳。
const declarationShell = route === StatementRoute.ShellFunctionDeclaration
  || route === StatementRoute.ShellClassDeclaration
  || route === StatementRoute.ShellDecoratedDeclaration;
if (route !== StatementRoute.ShellStatementFamily && route !== StatementRoute.ShellDeclarationFamily
  && !declarationShell) {
  return ShapeStates.Reject;
}
if (tokenIndex !== headAt) {
  // **Stage 5d-3 的晚建窗口**（只给 `async function` / `abstract class`）：族要到第二个代码单元
  // （`function` / `class`）才判得出来，`Decide` 在第一个代码单元那一格只能返回 `None`（等待）。
  // 两格窗口是**刻意的上界**：再往后的格子说明这一条早就该由别的候选接管，不在这里无限补建
  // （`@` 装饰器族在 `@` 那一格就判出来了，不需要晚建）。
  if (!declarationShell) {
    return ShapeStates.Reject;
  }
  if (tokenIndex !== ItemUtil.NextCode(units, headAt + 1)) {
    return ShapeStates.Reject;
  }
}
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
const route = StatementRouteUtil.Decide(units, tokenIndex);
if (route === StatementRoute.None) {
  return false;
}
if (route === StatementRoute.ShellLabel) {
  // Stage 4f：首格即可建标签壳（文档前瞻已判出 `:`）；`:` 那一格保留为兼容通道。
  return tokenIndex === headAt || tokenIndex === ItemUtil.NextCode(units, headAt + 1);
}
if (route === StatementRoute.ShellDeclarationFamily) {
  return tokenIndex === headAt;
}
if (route === StatementRoute.ShellFunctionDeclaration || route === StatementRoute.ShellClassDeclaration
  || route === StatementRoute.ShellDecoratedDeclaration) {
  // Stage 5d-3：与 `ComputeByIndex` 同一个两格窗口（否则「可建」与「接受」两处判据会分叉）。
  return tokenIndex === headAt || tokenIndex === ItemUtil.NextCode(units, headAt + 1);
}
return route === StatementRoute.ShellStatementFamily && tokenIndex === headAt;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
let start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("控制流语句候选没有可搬的单元");
}
// 族在搬单元**之前**判：插壳之后 `ItemStart` 已经指向壳自己，再判就是另一条语句了。
const route = StatementRouteUtil.Decide(host.Data, tokenIndex);
// **起点同步（S4z-r2，W2）**：声明族的晚建格若落在「上一条语句已经收口」的边界上
// （`interface I { }` ⏎ `const a = 1;` 的 `const`、`type T = 1;` ⏎ `enum E` 的 `enum`），
// `ItemStart` 仍指向前一条语句，照旧搬 `[start..tokenIndex]` 会把已闭合的壳连同下一条语句的头
// 一起塞进新壳（S4r 的 `decl=2`、首节点 raw `Common`）。这一格只搬**边界 token 自己**：
// 起点收到 `tokenIndex`，`pos` 随之取「`tokenIndex - 1` 往前第一个非 trivia 单元的 `EndIndex`」，
// `moved` 只剩边界 token，前一条语句保持原样。
// 判据不新写第二份：直接读声明壳的「下一条语句已到」边界
// `StatementBoundaryUtil.IsDeclarationFollowBoundary`（Common 起点词 + 换行 + 上一段可收尾）。
// **不能读 `CanEndStatementAt`**（Stage 4af-a）：它的 `IsLateAtEof` 半边回答的是「这一格是不是文件末尾」，
// 在 `export { c }` / `import "x"` 这类**族在第二格才判出来、而第二格恰好是全文最后一个单元**的形态上，
// 会把「声明自己的尾巴（闭合 `{…}` / 字符串）」误判成「上一条语句已经收口」，于是 `start` 收到 `tokenIndex`，
// `export` 留在父单元、只剩括号进壳 → `BuildFromShell` 建出块/表达式语句、`DetachShell` 退 raw（族 A）。
// `IsDeclarationFollowBoundary` 只在「当前格是**起一条新语句的词**且它前面有换行」时为真，声明头的续接
// （`export {` / `import "x"` / `declare const`，都在同一行）恒为假，正是本判据要的语义。
if (route === StatementRoute.ShellDeclarationFamily && tokenIndex > start
  && StatementBoundaryUtil.IsDeclarationFollowBoundary(host.Data, tokenIndex)) {
  start = tokenIndex;
}
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
// Stage 4q：声明 / 导入导出族的终结候选自称 `ShellDeclarationFamily`（收口判据走
// `StatementBoundaryUtil` 的 `;` / EOF / ASI，与表达式语句族同一套边界规则；见
// `statement-end-possible-shape.xl.md`）。其余两族（控制流 / 标签）仍自称 `ShellStatementFamily`。
let endKind = StatementRoute.ShellStatementFamily;
if (route === StatementRoute.ShellDeclarationFamily) {
  endKind = StatementRoute.ShellDeclarationFamily;
} else if (route === StatementRoute.ShellFunctionDeclaration
  || route === StatementRoute.ShellClassDeclaration
  || route === StatementRoute.ShellDecoratedDeclaration) {
  // Stage 5d-3：根层声明壳的终结候选自称本族，收口走 `DeclarationShellEndCode`
  // （体括号 / `;` / 声明跟随边界 / EOF，**不调 `ScanRoot`**）。
  endKind = route;
}
endShape.StatementKind = endKind;
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
if (route === StatementRoute.ShellLabel) {
  StatementRouteUtil.LabelShellCount += 1;
} else if (route === StatementRoute.ShellDeclarationFamily) {
  StatementRouteUtil.DeclarationShellCount += 1;
} else if (route === StatementRoute.ShellFunctionDeclaration) {
  StatementRouteUtil.FunctionDeclarationShellCount += 1;
} else if (route === StatementRoute.ShellClassDeclaration) {
  StatementRouteUtil.ClassDeclarationShellCount += 1;
} else if (route === StatementRoute.ShellDecoratedDeclaration) {
  StatementRouteUtil.DecoratedDeclarationShellCount += 1;
} else {
  StatementRouteUtil.ControlFlowShellCount += 1;
}
// Stage 4t：声明族的**晚建壳**（`type` / `declare` / `interface` 的族在第二格才判出来）与
// `RootExpressionStatementPossibleShape` 的晚建补建同一手法——已经搬进壳的 raw 单元不会再触发壳自己的求值，
// 这里补一次，让壳内终结候选的增量状态（`StatementEndScan` 的 `Code` / `Checked`）从这一格起算；
// 不补的话壳停在「有单元、没判过界」的状态，下一次收口只能等 EOF 的 legacy 兜底。
// Stage 5d-3：`async function` / `abstract class` 的晚建（两格窗口）同理。
if (tokenIndex > start && (route === StatementRoute.ShellDeclarationFamily
  || route === StatementRoute.ShellFunctionDeclaration || route === StatementRoute.ShellClassDeclaration)) {
  shell.ComputePossibleShapes(context);
}
return shell;
```
