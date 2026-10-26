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

# class MemberAccessPossibleShape extends PossibleShape

WP-P1：声明初始化器位置的**成员访问**（`.` 族）候选——`let x = a.b` / `const x = obj.default`。

族判据 / 完成判据 / 建树全部在 `MemberChainJudge`（六个成员链候选共用同一份实现，只在 `Kind` 上分家）：
本候选只认 `Kind === "member"` 的链（链头 + **第一个**后缀是 `.`）。`.default` 这种「属性名是关键字」的形态
不需要另外的分支：`ExpressionBuilder` 对 `.` 之后的属性名走 `ParseName`，关键字在那里同样落成
`IdentifierShape`（legacy EOF 树：`IdentifierShape pos=12 src=[12,19) text="default"`）。

**同格互斥**：`?.` / `!` / `[` / `import.meta` / `super.m` 各归本目录下的另一个候选；族一旦落定，
其余五个候选在同一个格上 `Reject`，因此 `CatalogGuide` 的 `Candidates.size === 1` 能够成立。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册入口（`ExpressionShapeCatalog.AppendFragments`，锚点 `// [E-CAT:FRAGMENTS]`）。

```ts
shapes.push(new MemberAccessPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

- 越界 / trivia → `Uncertain`（`Reject` 在本条目内是永久的，trivia 格不能判死）；
- 族已落定 → 本族 `Accept`，别族 `Reject`；
- 族还没落定 → 只在**链头格**上 `Uncertain`（其余格 `Reject`：不能多活一个候选去阻塞别的候选建树）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
// `=` 是声明自己的赋值符（初始化器还没开始）：必须 `Uncertain` 保持在场。
// `CatalogGuide` 的 `Reject` 在本条目内**永不回来**——在 `=` 格上判死，后面的链头格就再没有本候选。
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
const kind = MemberChainJudge.Kind(units);
if (kind !== "") {
  if (kind !== "member") {
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
if (MemberChainJudge.Kind(units) !== "member") {
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
return MemberChainJudge.Claims("member", units, tokenIndex);
```
