# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { MemberChainJudge } from "./member-chain-judge.xl.md"
```

# namespace cangjie

# class NonNullPossibleShape extends PossibleShape

WP-P1 / WP-P3c：声明初始化器位置的**后缀非空断言**候选——`let x = a!` / `const x = y!`。

**这是表达式位置的 `!`**（`NonNullExpressionShape`，legacy EOF 树 `pos=7 src=[8,10)`、唯一子节点是操作数），
不是 A6 的定值断言 `let x!: T`（那条走 `VariableDeclarationShape` 的 `ExclamationTokenShape` 分支）。

**建树格（[P3c] 起启用）**：`!` 关闭那一格。P1 交付时那一格被 `DeclarationCellGuard` 一律 `Reject`
（A6 为 `let x!: T` 准备的守卫），候选在那里根本不在场，只能提前一格（链头格）猜着建，而链头格上
`IdentifierPrimaryPossibleShape` / `MemberAccessPossibleShape` 同时在场 ⇒ `Candidates.size > 1` ⇒ 这条路径
建不出来（`_reports/p1-member-chain.md` §4.1 的实测）。**P3c 把守卫收窄成「`=` 之前才拒」**之后，`!` 格
（Kind 已落定为 `nonnull`，本候选是该格唯一的活口）就能按成员链五族的同一套惯用法整棵建出：
`MemberChainJudge.CanBuild` 判「链已长完 + 之后只剩输入结束（允许 `;`）」，`MemberChainJudge.Build`
把 `=` 之后的 raw 单元交给 legacy `ExpressionBuilder`，类名 / 层级 / `Pos` / `src` 与 legacy EOF 逐节点同源。

**与 P3a 前缀 `!` 按位置互斥**：`let x = !y` 的 `!` 格上 `MemberChainJudge.Kind` 返回 `""`（`=` 之后第一个
代码单元是 `!` 本身，不是链头）⇒ 本候选 `Claims` 为假、`IsBuildable` 为假；反过来 `let x = a!` 的 `!` 格上
`PrefixUnaryPossibleShape.IsPrefixPosition` 为假（运算符串的前一个代码单元是操作数 `a`，不是 `=`）。
两个候选在同一格上永不同时 `Accept`。

**闸门必须是「整条链就是 `<操作数>!` 且之后只剩输入结束」**：`a! + b` / `a!.b` 这类续接形态不建，
`!` 格上照旧由终结候选显式抛错（C10，账本不变）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new NonNullPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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

族已落定（`!` 格）⇒ 交给 `MemberChainJudge.CanBuild`（「链长完 + 之后只剩输入结束」）；
族未落定的链头格仍保留 P1 的前移兜底判据（`PostfixEnd`），在 `!` 格另有活口时不会用到。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
const kind = MemberChainJudge.Kind(units);
if (kind !== "") {
  if (kind !== "nonnull") {
    return false;
  }
  return MemberChainJudge.CanBuild(units, context.Root.Template, context);
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

`!` 格上整棵交给 legacy 建造器（与 P1 其余五族同一份实现）：`MemberChainJudge.Build` 把 `=` 之后的全部
raw 单元建成 `NonNullExpressionShape` 并原位替换，`Pos` = `=` 的 `EndIndex`、`src` = 操作数起点到 `!` 之后
（legacy `pos=7 src=[8,10)`），随后 `host.MountedUnit = null`，后续单元仍归声明层。

```ts
return MemberChainJudge.Build(host, context);
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

`!` 格上的**认领**（D0 的 `ExpressionContinuationCatalog` 在 `VariableDeclarationEndPossibleShape` 的兜底
throw 之前问这一句）：

- 这一格是**本族的后缀 `!`**（`MemberChainJudge.Claims("nonnull", …)`：族已落定为 `nonnull`，且当前单元是
  `!`，也就是「前一个代码单元是链头、当前是 `!`」）⇒ `true`，语义是「继续等」，本格随后的
  `CatalogGuide` 会把它建成形状；
- 其余（含前缀位的 `!`：`let x = !y` 的链头是 `!` 本身，族不命中）⇒ `false`，前缀那一格留给 P3a，
  族不命中的续接形态保留 C10 的显式 `throw`。

```ts
return MemberChainJudge.Claims("nonnull", units, tokenIndex);
```
