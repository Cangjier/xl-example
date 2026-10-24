# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

判定缓存：**每个规则一个槽**——键是它的整数槽位号（`ItemSlotCache.SlotOf`），值是自己那一份判定状态。规则在自己的槽里读写，不必自己拼键名，规则之间也不会撞。

槽位是**整数下标**，所以两层缓存都是**数组**：取值是一次下标读，不再经过字符串哈希，也不必再读一次 `constructor.name`。发号只有一处——本类的 `Slots` 表：**同一个类 == 同一个槽**，不同的类一定是不同的槽。根规则（`RootRule`）与形状（`ShapeRule`）共用这一张表，所以同一份缓存里只会出现一套编号。

状态是每个规则自己立的**具名类**（各规则的 `…Scan`）。底层只能写 `any`：xl 的类型标注不接受 `{[key:string]:any}`（`E1204`），`Array<any>` 是这套规范里能写的落地形式——明确性由取值那一侧的泛型补回来（与 `SyntaxContext.GetDefault` 同款）。

缓存分两层，都按槽位分：`Values` 是**逐条目判定状态**，随 `Reset` 清空；`Share` 是**生命周期内可长期复用**的数据，不受 `Reset` 重置。

**共享槽**：一组规则（例如七个成员候选）故意共用一份结论时，它们共用**同一个**槽——那个槽号由这一组共同的标识类发出来（`MemberPossibleUtil.CacheKey` / `ClassMemberPossibleUtil.CacheKey` 这类常量就是这样一个槽号），而不是各自的 `this.Slot()`。判据没变：同一个类同号，不同的类不同号。

# class ItemSlotCache

## static field Slots:Map<any, int> = new Map()

规则类 → 槽位号。进程内单调发号：同一个类第一次问到才拿号，之后永远是同一个号；不同的类一定拿到不同的号。

**键是类对象本身**（函数对象的引用同一性），不是类名——两个不同的类即使 `name` 相同，也拿两个不同的槽。

## static method SlotOf:(ruleClass:any)=>int

问一个类要槽位号；没发过号就现在发一个。**同一个类 == 同一个槽**，这是槽位作为缓存键的全部依据。

用 `Map` 而不是每次重算，是因为发号只发生在某个类**第一次**进缓存的时候；之后每次 `GetState` / `SetState` 命中的都是一次 `Map.get`，比读 `constructor.name`（访问器 + 字符串）便宜一个量级。

```ts
const known = ItemSlotCache.Slots.get(ruleClass);
if (known !== undefined) {
  return known;
}
const slot = ItemSlotCache.Slots.size;
ItemSlotCache.Slots.set(ruleClass, slot);
return slot;
```

## field Values:Array<any> = []

槽位号 → 该规则的判定状态。下标就是槽位；没写过的槽读出来是 `undefined`（`GetState` 把它折成 `null`）。

## field Share:Array<any> = []

槽位号 → 该规则**生命周期内长期复用**的数据（跨条目共享）。

与 `Values` 的分界：`Values` 只对「当前这一条目」有效，`Reset` 一调就清；`Share` 活到持有这份缓存的宿主 Shape 结束，普通 `Reset` **不**动它。

**由 Build 阶段按需处理**：`BuildByIndex`（普通候选与终结候选都算）与 `BuildFromCode` 里读 `Share`，缺了就地建，建完写回；`Compute` / `ComputeByIndex` 不假定 `Share` 里已经有东西。

**因为 `Reset` 不清 `Share`，每条共享数据必须自带新鲜度判据**（例如 `Start`、长度、版本号）：换到下一条目后，旧数据可能还指着上一条目的结论，所以使用前必须校验，失效就重建；否则会拿上一条目的结论去判下一条目。

## method GetState:<Item>(slot:int)=>Item | null

取这个规则的状态；还没写过给 `null`。类型由调用方点明：`cache.GetState<XxxScan>(this.Slot())`。

一次下标读代替旧的 `has` + `get` 两次哈希：键是整数槽位，数组没有哈希这一步。

```ts
const value = this.Values[slot];
if (value === undefined) {
  return null;
}
return value as Item;
```

## method SetState:<Item>(slot:int, state:Item)=>void

写这个规则的状态。**只在第一次建状态时调**——状态对象建出来之后由规则就地改，缓存里握着的是同一个对象。

```ts
this.Values[slot] = state;
```

## method GetShare:<Item>(slot:int)=>Item | null

取这个规则的共享数据；还没写过给 `null`。类型由调用方点明：`cache.GetShare<XxxShared>(key)`。

```ts
const value = this.Share[slot];
if (value === undefined) {
  return null;
}
return value as Item;
```

## method SetShare:<Item>(slot:int, value:Item)=>void

写这个规则的共享数据。与 `SetState` 一样**只在第一次建时调**——对象建出来之后由规则就地改，`Share` 里握着的是同一个对象。

```ts
this.Share[slot] = value;
```

## method ClearShare:()=>void

清空全部共享数据。**普通 `Reset` 不调它**：`Share` 的生命周期 = 持有这份缓存的宿主 Shape 的生命周期，只有 Shape 生命周期收尾、要归还这部分内存时才清。

```ts
this.Share = [];
```

## method Clear:()=>void

清空**逐条目判定状态**（`Values`）。规则建完之后由宿主调一次——下一条目的判定必须从零开始，留着上一条的状态会判错。

**`Share` 不清**：它是生命周期内长期复用的数据，不受 `Reset` 重置；要清只能显式调 `ClearShare`。

换一个新数组而不是逐个置空：槽位是整数下标，整表作废就是 O(1)，而且不必知道最大的槽号。

```ts
this.Values = [];
```
