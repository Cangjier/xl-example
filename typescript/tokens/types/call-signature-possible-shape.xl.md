# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CallSignatureShape } from "./call-signature-shape.xl.md"
import { MemberPossibleScan } from "./property-signature-possible-shape.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

# class CallSignaturePossibleShape extends PossibleShape

```txt
interface I { (): A; }
interface I { (a: A, b?: B): C }
interface I { <T>(x: T): U }
interface I { (...rest: A[]): B }
interface I { a: A; (): B }
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.CallKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.CallKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("CallSignaturePossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
const basePos = MemberPossibleUtil.BasePos(host, start);
const builder = new TypeBuilder(host.Template, context);
const consumedLength = builder.LoadFrom(host.Data, start, end + 1, basePos);
const built = builder.ParseTypeMember();
if (!MemberPossibleUtil.MemberParsedWhole(builder, consumedLength)) {
  return host;
}
if (!(built instanceof CallSignatureShape)) {
  throw new Error("CallSignaturePossibleShape.BuildByIndex: 产出不是 CallSignatureShape");
}
host.Data.splice(start, consumedLength, built);
MemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
