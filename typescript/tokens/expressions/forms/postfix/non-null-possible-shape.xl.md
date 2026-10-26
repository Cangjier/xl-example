# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { NonNullExpressionShape } from "../../non-null-expression-shape.xl.md"
import { MemberChainJudge } from "./member-chain-judge.xl.md"
```

# namespace cangjie

# class NonNullPossibleShape extends PossibleShape

WP-P1：声明初始化器位置的**后缀非空断言**候选——`let x = a!` / `const x = y!`。

**这是表达式位置的 `!`**（`NonNullExpressionShape`，legacy EOF 树 `pos=7 src=[8,10)`、唯一子节点是操作数），
不是 A6 的定值断言 `let x!: T`（那条走 `VariableDeclarationShape` 的 `ExclamationTokenShape` 分支）。

**为什么不在 `!` 那一格建树**：增量声明的候选目录被 `DeclarationCellGuard` 包着，它在 `!` 格上**一律**
`Reject`（`variable-declaration-list-possible-shape.xl.md` 的 `DeclarationCellGuard.ComputeByIndex`，为 A6 的
`let x!: T` 准备的守卫）。`Reject` 在 `CatalogGuide` 里是永久的，所以 `!` 关闭那一格上本候选已经不在
`Candidates` 里了——在那一格建树是不可能的。

因此本候选**提前一格建**：链头（操作数）闭合的那一格就看文档前瞻，确认「之后紧接 `!`、`!` 之后只剩输入结束」
（`MemberChainJudge.PostfixEnd`），当场用 `IdentifierShape` + `NonNullExpressionShape` 建出整棵。
`!` 本身不是 `NonNullExpressionShape` 的 legacy 子节点（legacy 只有操作数一个子节点），所以它随后作为普通
单元落进声明、由 `FinishIncremental` 收口时丢弃——与 legacy `Data` 逐节点一致。

**闸门必须是「整条链就是 `<操作数>!` 且之后只剩输入结束」**：`a! + b` / `a!.b` 这类续接形态不前移，
`!` 格上照旧由终结候选显式抛错（C10，账本不变）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new NonNullPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
// `=` 是声明自己的赋值符（初始化器还没开始）：必须 `Uncertain` 保持在场（`Reject` 在本条目内永不回来）。
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
const kind = MemberChainJudge.Kind(units);
if (kind !== "") {
  if (kind !== "nonnull") {
    return ShapeStates.Reject;
  }
  return ShapeStates.Accept;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return ShapeStates.Reject;
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt !== tokenIndex) {
  return ShapeStates.Reject;
}
if (!MemberChainJudge.HeadAllowed(unit)) {
  return ShapeStates.Reject;
}
if (MemberChainJudge.PostfixEnd(unit) < 0) {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

`!` 已经进 `units` 的格上不建（那一格被守卫挡住，轮不到本候选）；只在前移的链头格上放行。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (MemberChainJudge.Kind(units) !== "") {
  return false;
}
if (!(unit instanceof Common)) {
  return false;
}
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt !== tokenIndex) {
  return false;
}
if (!MemberChainJudge.HeadAllowed(unit)) {
  return false;
}
return MemberChainJudge.PostfixEnd(unit) >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

链头格上建出 `NonNullExpressionShape`：`Pos` = `=` 的 `EndIndex`（C1），`src` 从操作数起点到 `!` 之后
（legacy `pos=7 src=[8,10)`），操作数按 `IdentifierShape.FromBasicToken` 物化、`Pos` 与父同口径；随后把
`=` 之后的全部单元换成这一个根。

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 非空断言操作数");
}
const bangEnd = MemberChainJudge.PostfixEnd(token);
if (bangEnd < 0) {
  throw new Error("增量变量形状未支持：expression 非空断言缺少感叹号");
}
const equalAt = MemberChainJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：declaration 非空断言缺赋值符");
}
const equalUnit = host.Data[equalAt];
let pos = equalUnit.SourceRange.EndIndex;
if (pos < 0) {
  pos = equalUnit.SourceRange.StartIndex;
}
const identifier = IdentifierShape.FromBasicToken(token, context);
identifier.Pos = pos;
const nonNull = new NonNullExpressionShape(host.Template);
nonNull.Add(identifier);
nonNull.Pos = pos;
const operandStart = token.SourceRange.StartIndex;
nonNull.SignIn(operandStart >= 0 ? operandStart : pos);
nonNull.SignOut(bangEnd);
nonNull.TryToClose(context);
const start = equalAt + 1;
const removed = host.Data.length - start;
host.Data.splice(start, removed, nonNull);
nonNull.Parent = host;
host.MountedUnit = null;
return nonNull;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

**暂时恒 `false`（本包未完成项，见 `_reports/p1-member-chain.md`）**。

认领 `!` 格会让终结候选 `Reject`（继续等），但本候选**没有可用的建树格**：`!` 关闭那一格被 A6 的
`DeclarationCellGuard` 一律 `Reject`，链头格上又因为 `IdentifierPrimaryPossibleShape` 同时在场而
`Candidates.size > 1`。于是唯一的结果是从 `throw` 漂移成 `atomic`（EOF 兜底原子建）——账本不允许
（`tts` 的目录标注是 `throw`，`partial` / `atomic` 都不算完成），所以这里**显式不认领**，保留 C10 的
原有抛错。等 A6 把守卫的 `!` 收窄成「`=` 之前才拒」之后，这里只需改回
`MemberChainJudge.Claims("nonnull", units, tokenIndex)` + 尾巴闸门即可。

```ts
// [P1:BLOCKED] `!` 格被 DeclarationCellGuard 拒掉 ⇒ 没有建树格；认领只会把 throw 漂移成 atomic。
return false;
```
