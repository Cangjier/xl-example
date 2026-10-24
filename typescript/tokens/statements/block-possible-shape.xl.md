# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BodyGuideUtil } from "../declarations/body-guide-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ControlFlowStatementPossibleShape } from "./control-flow-statement-possible-shape.xl.md"
import { RootExpressionStatementPossibleShape } from "./root-expression-statement-possible-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
import { VariableStatementPossibleShape } from "./variable-statement-possible-shape.xl.md"
```

# namespace cangjie

# class BlockBodyWaitingPossibleShape extends PossibleShape

块体目录的**占位终结候选**：永远 `Uncertain`、永远不建。

它只负责一件事：块内第一个代码单元不属于任何已接管族时（`;` / `if` / 嵌套 `{` …），目录不会因为
「候选全被拒 + 没有终结候选」抛 `没有候选形状可以构成`（那会把整条文件逼进 fallback）。
那些语句保持 raw，留给 `BuildBlock` 的 legacy 递归或 `CollectBodyStatements` 的 raw 段建——
这是块内未覆盖构造的安全回退，而不是失败。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
return host;
```

# class BlockPossibleShape extends PossibleShape

```txt
{ }
{ let x = 1; f(); }
{ { a; } }
```

**块语句的根起点候选**（设计 §1.4 / Stage 4 S4a）。它只认 `StatementRoute.ShellBlock` 起点
（语句首 `{`），在首代码单元到齐时就建 `StatementShape` 壳（`Kind = StatementRoute.ShellBlock`、
`BodyKind = StatementShape.BodyKindBlock`）、把已经攒下的 `{` 括号单元搬进壳、`host.MountedUnit = 壳`；
语句怎么结束、怎么建树全部下放给壳自己的终结候选（`StatementEndPossibleShape`）。

**为什么块可以壳化、而二义不在 Bracket 里裁**：语句首的 `{` 只可能是块语句——对象字面量只出现在
表达式位置（`({ a: 1 });` 的语句首是 `(`，走 `ShellPlainExpression`；`x = { a: 1 }` 的 `{` 是
`=` 之后的括号，由 `ExpressionBuilder` 吃）。所以「块 vs 对象字面量」在
`StatementRouteUtil.Decide` 这一处已经裁决完，本候选只读那个被判出来的 `ShellBlock`，
**不在 Bracket 里新起第二份判据**。

**AST 零差异的来源**：壳收口时 `StatementShape.BuildFromShell` 把**同一个 `{ ... }` 括号单元**
（原子单元，内部仍是 raw basic token）交给**同一个** `StatementBuilder`，走 `BuildBlock()`；
`Pos` 仍取「前一个非 trivia 单元 `EndIndex`」。三条与 legacy
（`StatementPossibleShape` → `BuildStatement` → `BuildBlock`）逐字相同，所以 XML 逐字节、
AST 逐节点一致。块内语句仍由 `BuildBlock` 原子递归（块内目录见 `EnableBlockBodyCatalog`）。

**互斥（不靠先后）**：`Decide` 判成 `ShellBlock` 后，`StatementPossibleShape` 在
`ComputeByIndex` 顶部对「非 `Legacy`」主 `Reject`；`ExpressionStatementPossibleShape` 的
`CanStart` 对 `{` 返回 `false` 本来就不接。两边永远不会同格 Accept。
## private static field CreateBodyPossibleShapesCache:Array<PossibleShape> | null = null

块体语句候选目录的缓存（所有块 `{` 共用一份：候选实例无状态，判定状态在
`CatalogGuide.PossibleShapesComputeCache` 里，共用安全）。与
`BodyGuideUtil.CreateShapesCache` 同一手法。

## static method CreateBodyPossibleShapes:()=>Array<PossibleShape>

块体目录 = 「已经验证过的语句起点候选」：变量声明壳（`let/const/var`）与普通表达式壳。
两者都靠**自己的** `CatalogGuide` + `StatementEndPossibleShape` 收口，与宿主是不是
`SourceFileShape` 无关，所以挂到块体括号上可直接复用（与 `BodyGuideUtil.MountBodyGuide`
给 interface body 挂成员目录同一模式）。
```ts
BlockPossibleShape.CreateBodyPossibleShapesCache = BodyGuideUtil.CreateShapesCache(
  BlockPossibleShape.CreateBodyPossibleShapesCache,
  () => [new VariableStatementPossibleShape(), new RootExpressionStatementPossibleShape(), new ControlFlowStatementPossibleShape()]);
return BlockPossibleShape.CreateBodyPossibleShapesCache;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只在**首代码单元那一格** Accept：建壳之后本条语句已经归壳，后续字符由壳的
`MountedUnit` 路由（不再问根目录）。`Reject` 一旦发生就是永久删除，所以「首代码单元还没到」
（只有 trivia）必须返回 `Uncertain`；这条防御与 `VariableStatementPossibleShape` 的 5 行修复同源。
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
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== headAt) {
  return ShapeStates.Reject;
}
if (StatementRouteUtil.Decide(units, tokenIndex) !== StatementRoute.ShellBlock) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

首代码单元到齐即可建壳（此时 `{` 括号单元已经建出来、还可能没闭合）：块语句的收口在
`}` 闭合那一刻由终结候选决定，建壳不需要等括号闭合。
```ts
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
return StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellBlock;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

与 `VariableStatementPossibleShape.BuildByIndex` / `RootExpressionStatementPossibleShape.BuildByIndex`
**逐字同构**：搬 raw 单元、`Pos` 取「前一个非 trivia 单元 `EndIndex`」、原位插回壳、
`Parent` / `MountedUnit` 显式设置、终结候选是 `StatementEndPossibleShape`。
两处不同：① `Kind = StatementRoute.ShellBlock` 且 `BodyKind = BodyKindBlock`（供块内目录与
后续 Stage 4b 读）；② 终结候选的 `StatementKind` 保持 `0`，即**沿用 legacy 的
`StatementScanner.ScanRoot` 判界**（`{ }` 的结束由扫描器说，与 legacy 同一份判据），
不走表达式族的 `ExpressionEndCode`。

**块体目录挂载**：`StatementRouteUtil.EnableBlockBodyCatalog` 为 `true` 时，把
`CreateBodyPossibleShapes()` 挂到 `{` 括号的 `CatalogGuide` 上（`BodyGuideUtil.MountBodyGuide`）。
默认 `false`：`StatementBuilder.BuildBlock()` 目前只吃 raw basic token，块内一旦被增量建成
`StatementShape` 形状，`BuildBlock` 就没有「收集已建语句」的通道（见 HANDOFF-s4-block.md
「未覆盖/剩余」）。开关默认关 = 未覆盖构造安全回退，不伪造接管。
```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("块语句候选没有可搬的单元");
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
shell.Kind = StatementRoute.ShellBlock;
shell.BodyKind = StatementShape.BodyKindBlock;
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
const endShape = new StatementEndPossibleShape();
endShape.StatementKind = 0;
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
let bodyBracket:Bracket | null = null;
for (const item of moved) {
  if (item instanceof Bracket && (item as Bracket).StartBracketChar === "{") {
    bodyBracket = item as Bracket;
  }
}
// 块体括号是在壳之前建出来的（`Bracket.Transit` 先把它 Add 到宿主并 `host.MountedUnit = 括号`），
// 壳接管之后必须把括号挂回**自己**名下：否则后续字符按宿主的 MountedUnit 落到壳上、块内语句进不了括号，
// `}` 也关不到括号，壳就一直挂着去吞下一条语句（S4b 修「同文件第二块不建壳」的根）。
// 搬进来的单元可能以 `{` 之前的 trivia（同文件第二块的换行空白块）开头，所以按类型扫出括号，
// 不能要求 `moved` 恰好只有一个单元——否则括号拿不到 `MountedUnit`，块内字符全落到壳上。`
if (bodyBracket !== null) {
  shell.MountedUnit = bodyBracket;
}
if (StatementRouteUtil.EnableBlockBodyCatalog && bodyBracket !== null) {
  BodyGuideUtil.MountBodyGuide(bodyBracket, BlockPossibleShape.CreateBodyPossibleShapes());
  bodyBracket.CatalogGuide = new CatalogGuide(
    BlockPossibleShape.CreateBodyPossibleShapes(),
    new BlockBodyWaitingPossibleShape());
}
StatementRouteUtil.BlockShellCount += 1;
return shell;
```