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

# class ElementAccessPossibleShape extends PossibleShape

WP-P1：声明初始化器位置的**下标访问**候选——`let x = a[0]`。

本候选只认 `Kind === "element"` 的链（链头 + **第一个**后缀是 `[` 括号）。`[` 关闭那个格上，终结候选的
`Bracket` 分支会抛 `declaration 括号`；本候选的 `ContinuationClaim` 在那里认领，`IsBuildable`
在括号关闭、其后只剩输入结束（或 `;`）时才放行整棵建树（`MemberChainJudge.Build`，legacy `ExpressionBuilder`
逐节点同源）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new ElementAccessPossibleShape());
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
  if (kind !== "element") {
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
if (MemberChainJudge.Kind(units) !== "element") {
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
return MemberChainJudge.Claims("element", units, tokenIndex);
```
