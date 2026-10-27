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

# class SuperPrimaryPossibleShape extends PossibleShape

WP-P1：声明初始化器位置的 **`super` 主表达式**候选——`class A extends B { m() { let x = super.m } }`。

legacy 形状类是 `SuperKeywordShape`（`typescript/tokens/keywords/super-keyword-shape.xl.md`，**已存在**，
本 WP 不新建形状类）。legacy EOF 树：`PropertyAccessExpressionShape pos=33 src=[34,41)` 的两个子节点是
`SuperKeywordShape pos=33 src=[34,39)` 与 `IdentifierShape pos=40 text="m"`；`ExpressionBuilder` 的
`super` 分支（`:2307`）给出 `SuperKeywordShape`、postfix 的 `.` 分支给出外层 `PropertyAccess`，本候选不自己拼。

本候选只认 `Kind === "super"` 的链（链头是关键字 `super`，第一个后缀是 `.`）。`super` 不在
`MemberChainJudge.PrefixKeywords` 里，所以它不会被当成前缀运算符退场，也不会被普通 `member` 候选抢走
（`Kind` 在它身上走 `super` 分支，`member` 候选在那里 `Reject`）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new SuperPrimaryPossibleShape());
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
  if (kind !== "super") {
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
if (!(unit as Common).Is("super")) {
  return ShapeStates.Reject;
}
if (!MemberChainJudge.ChainFollows(unit)) {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (MemberChainJudge.Kind(units) !== "super") {
  return false;
}
return MemberChainJudge.CanBuild(units, context.Root.Template, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
return MemberChainJudge.Build(host, context);
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
return MemberChainJudge.Claims("super", units, tokenIndex);
```
