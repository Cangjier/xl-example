# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ConstructSignatureShape } from "./construct-signature-shape.xl.md"
import { MethodSignatureShape } from "./method-signature-shape.xl.md"
import { MemberPossibleScan } from "./property-signature-possible-shape.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

# class ConstructSignaturePossibleShape extends PossibleShape

```txt
interface I { new (): A; }
interface I { new (a: A, b: B): C; }
interface I { new <T>(a: T): A; }
interface I { abstract new (): A }
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.ConstructKind)) {
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
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.ConstructKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("ConstructSignaturePossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
let firstCode:Token | null = null;
const scanLimit = end + 1 <= host.Data.length ? end + 1 : host.Data.length;
for (let firstIndex = start; firstIndex < scanLimit; firstIndex++) {
  const firstUnit = host.Data[firstIndex];
  if (!firstUnit.IsTriviaToken) {
    firstCode = firstUnit;
    break;
  }
}
const modifierRecovery = firstCode !== null
  && (MemberPossibleUtil.TextOf(firstCode) === "abstract"
    || MemberPossibleUtil.TextOf(firstCode) === "readonly");
const basePos = MemberPossibleUtil.BasePos(host, start);
const builder = new TypeBuilder(host.Template, context);
const consumedLength = builder.LoadFrom(host.Data, start, end + 1, basePos);
const built = builder.ParseTypeMember();
if (!MemberPossibleUtil.MemberParsedWhole(builder, consumedLength)) {
  return host;
}
const isConstruct = built instanceof ConstructSignatureShape;
const isModifierMethodRecovery = modifierRecovery && built instanceof MethodSignatureShape;
if (!isConstruct && !isModifierMethodRecovery) {
  throw new Error("ConstructSignaturePossibleShape.BuildByIndex: 产出不是 ConstructSignatureShape");
}host.Data.splice(start, consumedLength, built);
MemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
