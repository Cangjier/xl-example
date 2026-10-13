# dependencies
```xl
import { PossibleShape } from "./possible-shape.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状目录向导：一份「候选目录 + 判定缓存」。

触发只有一条路径：basic token 关闭时逐层往上找到宿主（认的是 `IComputePossibleShapes`，且宿主的 `CatalogGuide` 指向本向导），由宿主把 `this` 转交进来；本向导问一遍候选（`PossibleShape.Compute`），被拒的当场移除，**当且仅当只剩一个候选**时把它交给 `PossibleShape.Build`，一个候选都不剩就抛错，还有多个就继续等后面的单元。

# class CatalogGuide

形状目录向导。

## field PossibleShapes:Array<PossibleShape>

本次尝试剩下的候选。构造时直接取传入的候选数组，判定过程中被拒的当场移除。

## field PossibleShapesComputeCache:Map<string, any> = new Map()

候选判定的缓存。键与值都由形状自己约定，同一向导的所有判定共用这一份。

## constructor:(shapes:Array<PossibleShape>)=>void

以候选目录创建。

```ts
this.PossibleShapes = shapes;
```

## method ComputePossibleShapes:(host:Token)=>void

拿**宿主**攒下的子单元问一遍剩下的候选，被拒的**当场移除**，然后按**个数**行动：只剩一个就建它，一个都不剩就抛错，还有多个就继续等后面的单元。

`host` 是参数不是字段；`PossibleShape.Build` 要用宿主，所以由这里往下传。

「接受」与「不确定」在这一次判定里同义——建不建只看剩下几个候选。

```ts
for (let index = 0; index < this.PossibleShapes.length; index++) {
  const item = this.PossibleShapes[index];
  if (item.Compute(host.Data, this.PossibleShapesComputeCache) === ShapeStates.Reject) {
    this.PossibleShapes.splice(index, 1);
    index--;
  }
}
if (this.PossibleShapes.length === 1) {
  this.PossibleShapes[0].Build(host, this);
  return;
}
if (this.PossibleShapes.length === 0) {
  throw new Error(`CatalogGuide: 没有候选形状可以构成（宿主 ${host.constructor.name}，已攒 ${host.Data.length} 个子单元）`);
}
```

## method ComputePossibleShapesByIndex:(host:Token, tokenIndex:int)=>void

```ts
const token = host.Data[tokenIndex];
if (token === undefined) {
  return;
}
for (let index = 0; index < this.PossibleShapes.length; index++) {
  const item = this.PossibleShapes[index];
  if (item.ComputeByIndex(host.Data, tokenIndex, this.PossibleShapesComputeCache) === ShapeStates.Reject) {
    this.PossibleShapes.splice(index, 1);
    index--;
  }
}
if (this.PossibleShapes.length === 1) {
  this.PossibleShapes[0].BuildByIndex(host, tokenIndex, this);
  return;
}
if (this.PossibleShapes.length === 0) {
  throw new Error(`CatalogGuide: 没有候选形状可以构成（宿主 ${host.constructor.name}，下标 ${tokenIndex}）`);
}
```
