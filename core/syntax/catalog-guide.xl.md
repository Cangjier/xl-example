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

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状目录向导：一份**完整的**候选目录 + 一份**还活着的**候选下标 + 一份判定缓存。

触发只有一条路径：basic token 关闭时**只问父单元**，父单元（实现了 `IComputePossibleShapes`、且 `CatalogGuide` 非空）把 `this` 转交进来；本向导问一遍还活着的候选（`PossibleShape.ComputeByIndex`），被拒的**从下标集里去掉**（候选数组一个字都不动），**当且仅当只剩一个候选**时把它交给 `PossibleShape.BuildByIndex`，建完**复位**；一个候选都不剩就抛错，还有多个就继续等后面的单元。

**双触发守卫**：同一个 `tokenIndex` + 同一个 `host.Data.length` 在成功建过一条形状之后再被问到，直接返回 `Nothing`（不重开候选、不重跑终结候选）。`Reset()` 紧跟每一次 `BuildByIndex`，它把 `Candidates` 重新填满——如果没有这道守卫，同一格第二次触发就是「重开一局」，带终结候选的向导会当场再建一条形状（双 build）。守卫的失效条件是**换格**（`tokenIndex` 变）或**换长度**（`host.Data.length` 变）；`Reset()` 本身不清它，因为「这一格已消费」是 `Reset()` 之后仍成立的事实。

# class CatalogGuide

形状目录向导。

## static field RepeatedCellSkipCount:int = 0

只读计数：双触发守卫命中的次数（同一 `tokenIndex` + 同一 `host.Data.length` 再次被问到而直接返回 `Nothing`）。
默认 0；开关关闭且没有重复触发时恒为 0。

## static field BuildCount:int = 0

只读计数：本进程内成功 `BuildByIndex` 的次数（普通候选与终结候选各算一次）。T2 用它核对
「同一格只建一次」：开关打开前后，同一份源码的读数应当相等。

## field PossibleShapes:Array<PossibleShape>

**完整的**候选目录。构造时取传入的数组，此后一个字都不改——被拒的候选不从数组里删，只从 `Candidates` 里去掉下标。

## field Candidates:Set<int> = new Set()

还活着的候选下标。构造时填满 `0..PossibleShapes.length-1`，判定中被拒的去掉一个，建完一条形状后重新填满。

## field EndPossible:PossibleShape | null = null

**终结候选**：单独一个，不进 `PossibleShapes`、不参与 `Candidates` 的淘汰。它回答的是「这条语句到这里该结束了」。

只有它 `Accept` 时才可能构建；它`Accept`而 `Candidates` 里还有候选，说明「既像结束、又像还能长」，直接抛错。

## field PossibleShapesComputeCache:PossibleShapeCache = new PossibleShapeCache()

判定缓存。形状在自己名下读写，同一向导的所有判定共用这一份。

## field FlushOnClose:bool = false

**宿主关闭时是否补判最后一格**（B3 新增，默认 `false`）。

`false`（所有既有向导）= B3 之前的行为：宿主关闭只问父单元，自己 `Data` 里最后一个子单元
如果正好被宿主的闭括号终结，就**拿不到一次判定**（`switch (a)` 的 `a` 因此到收口格还是 `Common`）。

`true` 只由 `BracketCatalogInstaller.BuildGuide` 在「角色目录声明了 `FlushOnClose`」时设置
（`BracketRoleCatalog.FlushOnClose`），也就是**只有 B0/B3 装上去的向导**会补这一格。
补判用的是同一个 `ComputePossibleShapesByIndex(host, Data.length - 1, context)`：
候选还在等就是 `Waiting`，一个候选都不剩才可能抛错——而 B0 的向导一律带永不 `Accept` 的终结候选，
所以这条路径对它们是安全的。

## field LastBuildTokenIndex:int = -1

**双触发守卫（T2）**：最近一次成功 `BuildByIndex` 的 `tokenIndex`；`-1` 表示还没建过。

它与 `LastBuildDataLength` 一起判定「这一格是不是已经建过」：两个都相同 ⇒ 同一格再次被问到，
直接返回 `Nothing`，不重开候选。`Reset()` **不清**它——复位候选集是建完之后的正常收尾，
而「这一格已消费」在复位之后依然成立。

## field LastBuildDataLength:int = -1

**双触发守卫（T2）**：最近一次成功 `BuildByIndex` 时的 `host.Data.length`（建完之后的长度）。

换格（`tokenIndex` 不同）或换长度（`host.Data.length` 不同）都会让守卫自然失效；
`-1` 与任何真实长度都不相等，所以初始状态永远不会误命中。

## constructor:(shapes:Array<PossibleShape>, endPossible?:PossibleShape | null)=>void

以候选目录创建，把所有下标放进 `Candidates`；终结候选单独收下。

```ts
this.PossibleShapes = shapes;
this.EndPossible = endPossible ?? null;
for (let index = 0; index < shapes.length; index++) {
  this.Candidates.add(index);
}
```

## method ComputePossibleShapes:(host:Token, context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

判全段就是判到最后一格为止：直接转调 `ComputePossibleShapesByIndex`。

`source` 是触发来源，**必填**（无默认值）；原样往 `ByIndex` 透传，判定本身不看它。

```ts
return this.ComputePossibleShapesByIndex(host, host.Data.length - 1, context, source);
```

## method ComputePossibleShapesByIndex:(host:Token, tokenIndex:int, context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

拿**宿主**攒下的子单元问一遍还活着的候选——`Candidates` 里那些下标，被拒的从 `Candidates` 里去掉——然后按**个数**行动：只剩一个就建它并复位，一个都不剩就抛错，还有多个就继续等后面的单元。

走到建之前再断言一次「恰好一个」。它不是重复判断，而是把不变量钉在取下标之前：上面的 `size === 0` / `size > 1` 两处已经把另外两种情况分走，若将来被绕过，这里当场炸，而不是取到 `undefined` 下标继续往下跑。

`host` 是参数不是字段；形状的 `BuildByIndex` 要用宿主，所以由这里往下传。

「接受」与「不确定」在这一次判定里同义——建不建只看剩下几个候选。

下标越界直接返回 `Nothing`（调用方可能按旧长度遍历）。

`context` 必须由形参传进来：这里是把消息（`ReloadMessage`）挂进上下文的唯一入口，
传成 `undefined` 时消息会被静默丢掉（`context?.Messages.push` 那个写法就是这么漏的），
所以这里**先验一刀**，漏了当场炸，而不是等到某条终结规则不生效才发现。

`source` 是本次判定的触发来源，**必填**（无默认值、不从字段或静态量取）。它只走形参：
候选循环与 `EndPossible` 都显式收到同一个 `source`；缓存 `PossibleShapeCache` **不保存来源**。

**双触发守卫**：进入候选判定之前先看 `LastBuildTokenIndex` / `LastBuildDataLength`——
两者与本次的 `tokenIndex` / `host.Data.length` 都相同，说明这一格已经建过，直接返回 `Nothing`，
不重开候选、不重跑终结候选。`Reset()` 不清这两个字段（见字段说明）。

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
  if (this.PossibleShapes[index].ComputeByIndex(host.Data, tokenIndex, this.PossibleShapesComputeCache, source) === ShapeStates.Reject) {
    this.Candidates.delete(index);
  }
}
let ended = false;
if (this.EndPossible !== null) {
  ended = this.EndPossible.ComputeByIndex(host.Data, tokenIndex, this.PossibleShapesComputeCache, source) === ShapeStates.Accept;
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

目录复位：`Candidates` 重新填满，判定缓存清空。`Clear` 清 `Values`（逐条目判定状态）；`Share` 保留——它是 Shape 生命周期内长期复用的数据，不受 `Reset` 重置。

**建完一条形状必须复位**：下一个条目的判定要从零开始——下标集不复位，就再也建不出第二个形状；缓存不清，就会拿上一条「读到第几格、什么档位」的状态去判下一条。

**双触发守卫的两个字段不清**：它们在 `BuildByIndex` 之后由调用方写入，记录的是「这一格已经建过」；
`Reset()` 是建完之后的正常收尾，清掉它们等于把守卫本身取消。失效只由「换格」或「换长度」自然完成。

```ts
this.Candidates.clear();
for (let index = 0; index < this.PossibleShapes.length; index++) {
  this.Candidates.add(index);
}
this.PossibleShapesComputeCache.Clear();
```
