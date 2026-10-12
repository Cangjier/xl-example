# dependencies
```xl
import { PossibleShape } from "./possible-shape.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状目录向导：一份「候选目录 + 判定缓存」。

**它不继承任何东西**——不是 token、不进树、不进 XML。攒下来的子单元和字符处理都归**宿主单元**（挂着自己的那个 `UnitToken`：`ProcessQueue` 是 `Template.BasicBranchQueue()`，`Data` 里就是那批 basic token）。

宿主**不当字段存**：只在调用判定时**当参数传进来**。所以本类没有 `Process` / `Close` / `Parent` / `Data` / `SourceRange` 这些成员——那些是 token 的事，归宿主。

触发只有一条路径：basic token 关闭时逐层往上找到宿主（认的是 `IComputePossibleShapes`，且宿主的 `CatalogGuide` 指向本向导），由宿主把 `this` 转交进来；本向导问一遍候选（`PossibleShape.Compute`），被拒的当场移除，**当且仅当只剩一个候选**时把它交给 `PossibleShape.Build` 建成形状、顶替宿主，一个候选都不剩就抛错，还有多个就继续等后面的单元。

# class CatalogGuide

形状目录向导。

## field Template:Template

宿主所在的模板。

`PossibleShape.Build` 建形状单元时要用它（`new XxxShape(catalog.Template)`）。

## field PossibleShapes:Array<PossibleShape>

本次尝试剩下的候选。构造时直接取传入的候选数组，判定过程中被拒的当场移除。

## field PossibleShapesComputeCache:Map<string, any> = new Map()

候选判定的缓存。键与值都由形状自己约定，同一向导的所有判定共用这一份。

## constructor:(template:Template, shapes:Array<PossibleShape>)=>void

以模板与候选目录创建。没有父构造器要转调——本类不继承任何东西。

```ts
this.Template = template;
this.PossibleShapes = shapes;
```

## method ComputePossibleShapes:(host:Token)=>void

拿**宿主**攒下的子单元问一遍剩下的候选，被拒的**当场移除**，然后按**个数**行动：只剩一个就建它，一个都不剩就抛错，还有多个就继续等后面的单元。

`host` 是参数不是字段；`PossibleShape.Build` 要用宿主才能顶替它，所以由这里往下传。

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
  const built = this.PossibleShapes[0].Build(host, this);
  this.PossibleShapes[0].BuildShapes(this, built);
  return;
}
if (this.PossibleShapes.length === 0) {
  throw new Error(`CatalogGuide: 没有候选形状可以构成（宿主 ${host.constructor.name}，已攒 ${host.Data.length} 个子单元）`);
}
```

## method ComputePossibleShapesByIndex:(host:Token, tokenIndex:int)=>void

按**一个下标**重算候选：只看宿主 `Data[tokenIndex]` 那一个子单元，其余与 `ComputePossibleShapes` 完全同款。

**为什么要它（`BuildShapes` 的规则记在这里）**：形状建好之后，若它的子树里存在一个 `Bracket`，而那个 `Bracket` 的 `Data` **全是 basic token**，就说明括号里的内容还没成形——此时需要 `BuildShapes`：`PossibleShape` 为那个 `Bracket` 新建一个 `CatalogGuide`，**以那个 `Bracket` 自己作宿主**遍历它的 `Data`，对每个下标调用的就是本方法。

也就是说本方法是「逐个喂子单元」那一侧的入口，`BuildShapes` 只负责找出该被继续成形的括号。

下标越界直接返回（调用方可能按旧长度遍历）。

```ts
const token = host.Data[tokenIndex];
if (token === undefined) {
  return;
}
for (let index = 0; index < this.PossibleShapes.length; index++) {
  const item = this.PossibleShapes[index];
  if (item.Compute([token], this.PossibleShapesComputeCache) === ShapeStates.Reject) {
    this.PossibleShapes.splice(index, 1);
    index--;
  }
}
if (this.PossibleShapes.length === 1) {
  const built = this.PossibleShapes[0].Build(host, this);
  this.PossibleShapes[0].BuildShapes(this, built);
  return;
}
if (this.PossibleShapes.length === 0) {
  throw new Error(`CatalogGuide: 没有候选形状可以构成（宿主 ${host.constructor.name}，下标 ${tokenIndex}）`);
}
```
