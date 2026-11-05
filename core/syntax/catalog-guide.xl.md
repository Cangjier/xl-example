# dependencies
```xl
import { ComputePossibleShapesStates } from "./compute-possible-shapes-states.xl.md"
import { PossibleShape } from "./possible-shape.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { PossibleShapeCache } from "./possible-shape-cache.xl.md"
import { PossibleSource } from "./possible-source.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Token } from "./token.xl.md"
import { TokenIndex } from "./token-index.xl.md"
```

# namespace cangjie

# class CatalogGuide

## field PossibleShapes:Array<PossibleShape>

## field Candidates:Set<int> = new Set()

## field EndPossible:PossibleShape | null = null

## field PossibleShapesComputeCache:PossibleShapeCache = new PossibleShapeCache()

## field FlushOnClose:bool = false

## field LastBuildTokenIndex:int = -1

## field LastBuildDataLength:int = -1

## constructor:(shapes:Array<PossibleShape>, endPossible?:PossibleShape | null)=>void

```ts
this.PossibleShapes = shapes;
this.EndPossible = endPossible ?? null;
for (let index = 0; index < shapes.length; index++) {
  this.Candidates.add(index);
}
```

## method ComputePossibleShapes:(host:Token, context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
return this.ComputePossibleShapesByIndex(new TokenIndex(host, host.Data.length - 1), context, source);
```

## method ComputePossibleShapesByIndex:(index:TokenIndex, context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
const host = index.Host;
const tokenIndex = index.Index;
if (typeof context === "undefined") {
  throw new Error(`CatalogGuide: context 必须通过形参传入（宿主 ${host.constructor.name}，下标 ${tokenIndex}）`);
}
if (!index.Has(tokenIndex)) {
  return ComputePossibleShapesStates.Nothing;
}
if (this.LastBuildTokenIndex === tokenIndex && this.LastBuildDataLength === host.Data.length) {
  return ComputePossibleShapesStates.Nothing;
}
for (const shapeIndex of this.Candidates) {
  if (this.PossibleShapes[shapeIndex].ComputeByIndex(index, this.PossibleShapesComputeCache, source) === ShapeStates.Reject) {
    this.Candidates.delete(shapeIndex);
  }
}
let ended = false;
if (this.EndPossible !== null) {
  ended = this.EndPossible.ComputeByIndex(index, this.PossibleShapesComputeCache, source) === ShapeStates.Accept;
  if (ended && this.Candidates.size > 0) {
    throw new Error(`CatalogGuide: 终结候选与其它候选同时成立（宿主 ${host.constructor.name}，下标 ${tokenIndex}）`);
  }
}
if (ended && this.EndPossible !== null) {
  this.EndPossible.BuildByIndex(index, this, context);
  this.LastBuildTokenIndex = tokenIndex;
  this.LastBuildDataLength = host.Data.length;
  this.Reset();
  return ComputePossibleShapesStates.Built;
}
if (this.Candidates.size === 0) {
  if (this.EndPossible === null) {
    throw new Error(`CatalogGuide: 没有候选形状可以构成（宿主 ${host.constructor.name}，下标 ${tokenIndex}）`);
  }
  return ComputePossibleShapesStates.Waiting;
}
if (this.Candidates.size > 1) {
  return ComputePossibleShapesStates.Waiting;
}
if (this.Candidates.size !== 1) {
  throw new Error(`CatalogGuide: 唯一候选不变量被破坏（宿主 ${host.constructor.name}，下标 ${tokenIndex}，候选 ${this.Candidates.size} 个）`);
}
const candidateIndex = Array.from(this.Candidates)[0];
if (!this.PossibleShapes[candidateIndex].IsBuildable(index, this.PossibleShapesComputeCache, context)) {
  return ComputePossibleShapesStates.Waiting;
}
this.PossibleShapes[candidateIndex].BuildByIndex(index, this, context);
this.LastBuildTokenIndex = tokenIndex;
this.LastBuildDataLength = host.Data.length;
this.Reset();
return ComputePossibleShapesStates.Built;
```

## private method Reset:()=>void

```ts
this.Candidates.clear();
for (let index = 0; index < this.PossibleShapes.length; index++) {
  this.Candidates.add(index);
}
this.PossibleShapesComputeCache.Clear();
```
