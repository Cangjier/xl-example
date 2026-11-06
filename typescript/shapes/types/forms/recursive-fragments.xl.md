# dependencies
```xl
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { TokenIndex } from "../../../../core/syntax/token-index.xl.md"
import { TypeAliasDeclarationShape } from "../type-alias-declaration-shape.xl.md"
import { TypeBodyUtil } from "../type-body-util.xl.md"
import { TypeParameterListShape } from "../type-parameter-list-shape.xl.md"
import { LiteralBuilder } from "./literal-fragments.xl.md"
import { TypeLiteralStartPossibleShape } from "./literal-fragments.xl.md"
```


# namespace cangjie

# class TypeLiteralRecursivePossibleShape extends PossibleShape

## method ComputeByIndex:(index:TokenIndex, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
// T5：`{` 容器的递归体。T2 的 TypeLiteralStartPossibleShape 对「body 里引用了别名自身」的
// `type A = { next: A | null }` 主动 Reject（见其 HasNameReference 判定），本类只补这一格：
// body 起点仍是 `{`、仍是成员终结符，但 body 里出现了别名自身的引用。
// 容器/成员的构建一行都不重写，BuildByIndex 直接复用 T2 的实现。
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return ShapeStates.Reject;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
// `type A<T>` 的 `<` 那一格让位给 TypeParameterListOpenPossibleShape（与 T1/T2/T4 同一约定）。
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return ShapeStates.Reject;
}
const bodyStart = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyStart < 0 || bodyStart >= units.length) {
  return ShapeStates.Uncertain;
}
if (!LiteralBuilder.IsSymbol(units[bodyStart], "{")) {
  return ShapeStates.Reject;
}
if (!LiteralBuilder.IsCloser(index.At(tokenIndex))) {
  return ShapeStates.Uncertain;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 1) {
  return ShapeStates.Uncertain;
}
// `{ [K in T]: ... }` 是映射类型（T4），即使体内引用了别名也不归本族。
if (LiteralBuilder.IsMappedBody(units, bodyStart, tokenIndex)) {
  return ShapeStates.Reject;
}
// 只接管自引用的 body：非自引用的 `{` 已被 T2 的候选接受，本类必须 Reject 让位。
const name = LiteralBuilder.AliasName(units);
if (!LiteralBuilder.HasNameReference(units.slice(bodyStart + 1, tokenIndex), name)) {
  return ShapeStates.Reject;
}
// 形态已确定是「递归 `{` 体」：把同目录的粘性候选（TypeAliasChainPossibleShape 等）
// 从本轮 Candidates 摘掉，否则恰一候选不成立，容器永远建不出来。Reset() 在建后自动恢复。
LiteralBuilder.Claim(host, this);
return ShapeStates.Accept;
```

## method IsBuildable:(index:TokenIndex, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (!(host instanceof TypeAliasDeclarationShape)) {
  return false;
}
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (TypeParameterListShape.IsHeaderOpen(units, tokenIndex)) {
  return false;
}
const bodyStart = TypeBodyUtil.BodyStart(units, tokenIndex, cache);
if (bodyStart < 0 || bodyStart >= units.length) {
  return false;
}
if (!LiteralBuilder.IsSymbol(units[bodyStart], "{")) {
  return false;
}
if (!LiteralBuilder.IsCloser(index.At(tokenIndex))) {
  return false;
}
if (LiteralBuilder.DepthBefore(units, tokenIndex) !== 1) {
  return false;
}
if (LiteralBuilder.IsMappedBody(units, bodyStart, tokenIndex)) {
  return false;
}
const name = LiteralBuilder.AliasName(units);
return LiteralBuilder.HasNameReference(units.slice(bodyStart + 1, tokenIndex), name);
```

## method BuildByIndex:(index:TokenIndex, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
// 递归 `{` 体与非递归 `{` 体的构建方式完全相同，只是「谁来认领这一格」不同：
// 成员扫描、闭合、Dispose、挂载都在 T2 的 TypeLiteralStartPossibleShape.BuildByIndex 里，
// 本文件不复制一份容器逻辑（见 T2 报告「懒挂载」）。
return new TypeLiteralStartPossibleShape().BuildByIndex(index, catalog, context);
```

# class RecursiveFragments

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
// T5：递归与收口族。目录里只多一个「body 起点」候选：
//   `{` + 自引用 → TypeLiteralRecursivePossibleShape（本文件的形状类）
// 其余（自引用之外的 `{`、`[`、函数、映射、模板）由 T1–T4 的片段各自负责。
shapes.push(new TypeLiteralRecursivePossibleShape());
```
