# dependencies
```xl
import { ComputePossibleShapesStates } from "./compute-possible-shapes-states.xl.md"
import { PossibleShape } from "./possible-shape.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { PossibleShapeCache } from "./possible-shape-cache.xl.md"
import { PossibleSource } from "./possible-source.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

# class CatalogGuide

## static field RepeatedCellSkipCount:int = 0

## static field BuildCount:int = 0

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
return this.ComputePossibleShapesByIndex(host, host.Data.length - 1, context, source);
```

## method ComputePossibleShapesByIndex:(host:Token, tokenIndex:int, context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
if (typeof context === "undefined") {
  throw new Error(`CatalogGuide: context 必须通过形参传入（宿主 ${host.constructor.name}，下标 ${tokenIndex}）`);
}
// [T2:GUARD] 同一格（tokenIndex + Data.length）已经成功建过 ⇒ 不重开候选。
// 换格 / 换长度都让两个字段不再相等，正常的新格因此不会被拦住。
const token = host.Data[tokenIndex];
if (token === undefined) {
  return ComputePossibleShapesStates.Nothing;
}
if (this.LastBuildTokenIndex === tokenIndex && this.LastBuildDataLength === host.Data.length) {
  CatalogGuide.RepeatedCellSkipCount += 1;
  return ComputePossibleShapesStates.Nothing;
}
for (const index of this.Candidates) {
  if (this.PossibleShapes[index].ComputeByIndex(host, tokenIndex, this.PossibleShapesComputeCache, source) === ShapeStates.Reject) {
    this.Candidates.delete(index);
  }
}
let ended = false;
if (this.EndPossible !== null) {
  ended = this.EndPossible.ComputeByIndex(host, tokenIndex, this.PossibleShapesComputeCache, source) === ShapeStates.Accept;
  if (ended && this.Candidates.size > 0) {
    throw new Error(`CatalogGuide: 终结候选与其它候选同时成立（宿主 ${host.constructor.name}，下标 ${tokenIndex}）`);
  }
}
if (ended && this.EndPossible !== null) {
  this.EndPossible.BuildByIndex(host, tokenIndex, this, context);
  this.LastBuildTokenIndex = tokenIndex;
  this.LastBuildDataLength = host.Data.length;
  CatalogGuide.BuildCount += 1;
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
const index = Array.from(this.Candidates)[0];
if (!this.PossibleShapes[index].IsBuildable(host.Data, tokenIndex, this.PossibleShapesComputeCache, context)) {
  return ComputePossibleShapesStates.Waiting;
}
this.PossibleShapes[index].BuildByIndex(host, tokenIndex, this, context);
this.LastBuildTokenIndex = tokenIndex;
this.LastBuildDataLength = host.Data.length;
CatalogGuide.BuildCount += 1;
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
