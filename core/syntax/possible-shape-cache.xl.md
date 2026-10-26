# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状判定的缓存：**每个形状一个槽**——键是形状的整数槽位号（`PossibleShape.Slot()`），值是这个形状自己那一份判定状态。形状在自己的槽里读写，不必自己拼键名，形状之间也不会撞。

槽位是**整数下标**，所以两层缓存都是**数组**：取值是一次下标读，不再经过字符串哈希，也不必再读一次 `constructor.name`。槽位由 `PossibleShape.SlotOf` 统一发号（见 `possible-shape.xl.md`）：**同一个类 == 同一个槽**，不同的类一定是不同的槽。

状态是每个形状自己立的**具名类**（各形状的 `…Scan`）。槽位数组的元素类型记为 `unknown`：xl 的类型标注不接受内联索引签名类型（`E1204`），而这一层确实**异质**——每个槽装的是某一形状自己的状态类，底层说不出一个共同类型。明确性由取值那一侧的泛型补回来（`GetState<XxxScan>` / `GetShare<XxxShared>`）；`unknown` 与 `any` 的区别是**读的时候必须显式收窄**（`value as Item`），写的一侧两条 `Set` 仍然接受任何状态对象。

缓存分两层，都按槽位分：`Values` 是**逐条目判定状态**，随 `Reset` 清空；`Share` 是**Shape 生命周期内可长期复用**的数据，不受 `Reset` 重置。

**共享槽**：一组形状（例如七个成员候选）故意共用一份结论时，它们共用**同一个**槽——那个槽号由这一组共同的标识类发出来（`MemberPossibleUtil.CacheKey` / `ClassMemberPossibleUtil.CacheKey` 这类常量就是这样一个槽号），而不是各自的 `this.Slot()`。判据没变：同一个类同号，不同的类不同号。

# class PossibleShapeCache

## field Values:Array<unknown> = []

槽位号 → 该形状的判定状态。下标就是槽位；没写过的槽读出来是 `undefined`（`GetState` 把它折成 `null`）。

## field Share:Array<unknown> = []

槽位号 → 该形状**在 Shape 生命周期内长期复用**的数据（跨条目共享）。

与 `Values` 的分界：`Values` 只对「当前这一条目」有效，`Reset` 一调就清；`Share` 活到持有这份缓存的 `CatalogGuide`（宿主 Shape）结束，普通 `Reset` **不**动它。

**由 Build 阶段按需处理**：`BuildByIndex`（普通候选与终结候选都算）与 `BuildFromCode` 里读 `Share`，缺了就地建，建完写回；`Compute` / `ComputeByIndex` 不假定 `Share` 里已经有东西。

**因为 `Reset` 不清 `Share`，每条共享数据必须自带新鲜度判据**（例如 `Start`、长度、版本号）：换到下一条目后，旧数据可能还指着上一条目的结论，所以使用前必须校验，失效就重建；否则会拿上一条目的结论去判下一条目。

## method GetState:<Item>(possibleShapeSlot:int)=>Item | null

取这个形状的状态；还没写过给 `null`。类型由调用方点明：`cache.GetState<XxxScan>(this.Slot())`。

一次下标读代替旧的 `has` + `get` 两次哈希：键是整数槽位，数组没有哈希这一步。

```ts
const value = this.Values[possibleShapeSlot];
if (value === undefined) {
  return null;
}
return value as Item;
```

## method SetState:<Item>(possibleShapeSlot:int, state:Item)=>void

写这个形状的状态。**只在第一次建状态时调**——状态对象建出来之后由形状就地改，缓存里握着的是同一个对象。

```ts
this.Values[possibleShapeSlot] = state;
```

## method GetShare:<Item>(possibleShapeSlot:int)=>Item | null

取这个形状的共享数据；还没写过给 `null`。类型由调用方点明：`cache.GetShare<XxxShared>(key)`。

```ts
const value = this.Share[possibleShapeSlot];
if (value === undefined) {
  return null;
}
return value as Item;
```

## method SetShare:<Item>(possibleShapeSlot:int, value:Item)=>void

写这个形状的共享数据。与 `SetState` 一样**只在第一次建时调**——对象建出来之后由形状就地改，`Share` 里握着的是同一个对象。

```ts
this.Share[possibleShapeSlot] = value;
```

## method ClearShare:()=>void

清空全部共享数据。**普通 `Reset` 不调它**：`Share` 的生命周期 = 持有这份缓存的宿主 Shape（`CatalogGuide`）的生命周期，只有 Shape 生命周期收尾、要归还这部分内存时才清。

```ts
this.Share = [];
```

## field ItemStartValue:int = -1

当前条目已经算出的 `ItemUtil.ItemStart` 值；`-1` 表示还没算过。

**生命周期 = `Clear()`**：所以它是**按条目**的记忆。这与 `Values` 的边界完全一致——`Clear()` 只在
`CatalogGuide.Reset()` 里被调用，而 `Reset()` 紧跟每一次 `BuildByIndex`，于是「两次 `Clear` 之间」恰好就是
「`host.Data` 不再变动的那一段」。跨条目要复用的数据必须走 `Share`，不是这里。

## field ItemStartLength:int = -1

`ItemStartValue` 是对**长度为此值**的 units 算出来的。`Clear()` 一并复位；长度对不上就重算——
`host.Data` 的整条目 splice 只会让它变短，长度变了必然意味着条目已经换了。

## method GetItemStart:(unitsLength:int)=>int

取当前条目的 `ItemStart`；没算过、或 units 长度已经变了，给 `-1`（调用方据此重算）。
```ts
if (this.ItemStartValue < 0 || this.ItemStartLength !== unitsLength) {
  return -1;
}
return this.ItemStartValue;
```

## method SetItemStart:(value:int, unitsLength:int)=>void

记住当前条目的 `ItemStart`。值本身可以是 `0`（整条 units 都是基本 token），所以「没算过」只能用 `-1` 表示。
```ts
this.ItemStartValue = value;
this.ItemStartLength = unitsLength;
```

## method Clear:()=>void

清空**逐条目判定状态**（`Values`）。形状建完之后由 `CatalogGuide` 调一次——下一条目的判定必须从零开始，留着上一条的状态会判错。

**`Share` 不清**：它是 Shape 生命周期内长期复用的数据，不受 `Reset` 重置；要清只能显式调 `ClearShare`。

换一个新数组而不是逐个置空：槽位是整数下标，整表作废就是 O(1)，而且不必知道最大的槽号。

```ts
this.Values = [];
this.ItemStartValue = -1;
this.ItemStartLength = -1;
```
