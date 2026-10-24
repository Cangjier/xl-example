# dependencies
```xl
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

根 item 规则契约（WP-7 D-1）：根宿主 `SourceFileBodyItemHost` 真正需要候选做的三件事，**不带 possible 语义**。

`possible-shape.xl.md` 把「候选」和「目录（`CatalogGuide`）」绑在一起：候选是目录里的一格，构造要收目录、建造要收目录。
但根 item 引擎实际上只做两件事——**判前缀**（`ComputeByIndex`）和**问能不能建**（`IsBuildable`），
建造一律走各族自己的静态入口（`root-item-rule` 的 `BuildByKind`），**从不调 `BuildByIndex`**。
所以本契约只声明这三条，`BuildByIndex` 故意**不在契约里**：
根引擎不调它，而把它留在契约里会把 `CatalogGuide` 形参带进来，契约就又变成 possible 语义了。

这条「不含 `BuildByIndex`」的选择是有意的**迁移杠杆**：`PossibleShape` 的三个成员
（`Slot` / `ComputeByIndex` / `IsBuildable`）与 `IRootRule` 逐字同签名，因此**任何 existing possible 都结构化满足本契约**。
于是迁移可以**一个类一个类地换**，中间态（一半 `IRootRule`、一半 `PossibleShape`）仍然类型正确，
不必一次性重写 13 个候选、也不必先动 `core/`。

# interface IRootRule

一条根规则：能判前缀、能报「现在建得成不成」。够根引擎用，不多要一条。

## method Slot:()=>int

本规则在判定缓存里的槽位号。缓存按槽位存取，同一张表里每个规则类必须拿到**互不相同**的槽位。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判 `units[0..tokenIndex]`（含该下标）这一段能不能构成本规则。`Accept` / `Reject` / `Uncertain` 三态，
与 `PossibleShape.ComputeByIndex` **同签名同语义**——这正是现有候选可以逐个搬过来的原因。

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

「现在可以试着建了吗」。`false` 表示还缺后续单元，让根挂起等待（`Uncertain` 的补充，不是替代）。

# class RootRule

根规则基类：**只**提供槽位分配，不提供建造、不持有目录、不认识 `CatalogGuide`。
从 `PossibleShape` 搬出来的规则类改继承本类即可，判据与建造代码一字不动。

## static field Slots:Map<any, int> = new Map()

规则类 → 槽位号。**键是类对象本身**（不是类名）：两个不同的类即使 `name` 相同也拿不同的槽。

与 `PossibleShape.Slots` 是**两张独立的表**：迁移期同一份缓存里只会出现一种编号方案
（根引擎只调 `IRootRule.Slot`，旧 `CatalogGuide` 路径只调 `PossibleShape.Slot`），
所以两张表各自从 0 发号不会撞车。全部迁完之后 `PossibleShape.Slots` 随 D-2 一起消失。

## static field SlotBase:int = 100000

迁移期两个发号器并存：`PossibleShape.Slots` 从 0 开始，本类也从 0 开始，而两者共用同一份
`PossibleShapeCache`（槽位就是数组下标）——直接混用会让已迁移的规则与尚未迁移的候选**撞槽**，
读到对方的状态对象。所以本类从 `100000` 起发号：数组因此稀疏，但每个宿主最多只用掉几个槽，
代价可忽略；D-2 只剩一套发号器时本字段随之删除。

## static method SlotOf:(ruleClass:any)=>int

问一个规则类要槽位号；没发过号就现在发一个。

```ts
const known = RootRule.Slots.get(ruleClass);
if (known !== undefined) {
  return known;
}
const slot = RootRule.SlotBase + RootRule.Slots.size;
RootRule.Slots.set(ruleClass, slot);
return slot;
```

## method Slot:()=>int

本规则的槽位号，取**运行时类**（`this.constructor`），所以基类给一次实现、所有规则共用。

```ts
return RootRule.SlotOf(this.constructor);
```

# class RootRuleTable

根宿主的规则表：规则数组 + 判定缓存。**替代 `CatalogGuide` 在根上的那两个职责**
（`PossibleShapes` 数组与 `PossibleShapesComputeCache`），但**不含**目录语义：
不认领候选、不淘汰、不挂 `EndPossible`——那些是根引擎 `root-item-rule` 自己的事。

## field Rules:Array<IRootRule>

根候选，顺序即竞争顺序。由 `SourceFileShape.CreateRules()` 注入
（迁移期仍是 `CreatePossibleShapes()`，返回类型同为数组）。

## field Cache:PossibleShapeCache = new PossibleShapeCache()

判定缓存。缓存类型**暂时**仍是 `PossibleShapeCache`（`core/` 的既有类，本波只读不改）；
D-2 把 `possible-shape-cache` 改名收口时，这里跟着换名，根引擎的调用面不变。

## constructor:(rules:Array<IRootRule>)=>void

以规则表创建。表本身不发号、不清零——复位由根引擎在自己的 `Reseed` 里调 `Reset`。

```ts
this.Rules = rules;
```

## method Count:()=>int

规则条数。根引擎的淘汰循环用它当上界（原本读 `CatalogGuide.PossibleShapes.length`）。

```ts
return this.Rules.length;
```

## method At:(index:int)=>IRootRule | null

按下标取规则；越界给 `null`（根引擎在淘汰循环里逐格取值，越界不该抛）。

```ts
if (index < 0 || index >= this.Rules.length) {
  return null;
}
return this.Rules[index];
```

## method Reset:()=>void

清空判定缓存。根引擎每建完一条都要调它（原本是 `CatalogGuide.PossibleShapesComputeCache.Clear()`）。

```ts
this.Cache.Clear();
```
