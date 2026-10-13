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
  this.PossibleShapes[0].Build(host, this);
  return;
}
if (this.PossibleShapes.length === 0) {
  throw new Error(`CatalogGuide: 没有候选形状可以构成（宿主 ${host.constructor.name}，已攒 ${host.Data.length} 个子单元）`);
}
```

## method ComputePossibleShapesByIndex:(host:Token, tokenIndex:int)=>void

按**一个下标**重算候选：判定范围是宿主 `Data[0..tokenIndex]`——**到这个下标为止**那一段（含该下标），其余与 `ComputePossibleShapes` 完全同款。

判定本身交给 `PossibleShape.ComputeByIndex`：传进去的是宿主 `Data` **整个数组加一个下标**，由形状自己取前缀、自己决定还要看什么（`Compute` 那侧收到的是全部子单元，那是 `ComputePossibleShapes` 的事）。它是抽象方法、基类没有默认实现——每个形状都得自己写。

**为什么要它**：`ComputePossibleShapes` 一次看全部子单元，本方法是它的**逐个喂**版本——调用方按下标递增地喂，判定范围随下标推进。

也就是说本方法是「逐个喂子单元」那一侧的入口：只剩一个候选时交给 `PossibleShape.BuildByIndex`——它比 `Build` 多拿一个下标，知道这次建的是第几个位置上的那一批。

下标越界直接返回（调用方可能按旧长度遍历）：越界时那个窗口里还缺单元，判定没有意义；更不能据此把候选摘掉，或者刚好只剩一个就在一个不存在的位置上建形状。

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
