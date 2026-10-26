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
import { MemberChainJudge } from "./member-chain-judge.xl.md"
```

# namespace cangjie

# class OptionalChainPossibleShape extends PossibleShape

WP-P1：声明初始化器位置的**可选链**候选——`let x = a?.b`。

本候选只认 `Kind === "optional"` 的链（链头 + **第一个**后缀是 `?.`）。legacy EOF 树里 `?.` 是
`PropertyAccessExpressionShape` 的**三个**子节点之一（`IdentifierShape a` / `QuestionDotTokenShape op="?."` /
`IdentifierShape b`），那三个子节点与 `Pos` 全部由 `ExpressionBuilder` 的 `?.` 分支给出，本候选不自己拼。

`?.` 是多字符 `Symbol`（`?` 与 `.` 合成一个单元），只在 `?.` 关闭那一格才落定族：`?` 单独的格上族仍为空
（`MemberChainJudge.Kind === ""`），本候选保持 `Uncertain` 等 `?.` 长完。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new OptionalChainPossibleShape());
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
  if (kind !== "optional") {
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
if (!MemberChainJudge.ChainFollows(unit)) {
  return ShapeStates.Reject;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (MemberChainJudge.Kind(units) !== "optional") {
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
return MemberChainJudge.Claims("optional", units, tokenIndex);
```
