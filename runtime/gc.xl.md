# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapObject, HeapTable, PopInt } from "./heap.xl.md"
```

# namespace cangjie

回收器：**精确 mark-sweep，不移动**。契约见
[docs/runtime-architecture.md](../docs/runtime-architecture.md) §9。

不移动的理由是双重的：句柄因此**稳定**（宿主跨调用持有的值不会失效），而且不需要写屏障
（实现简单、易审）。代价是碎片，v1 接受。

**回收器不注册根，而是在安全点收一份快照。**

`RootSet` 不是「谁把自己的数组登记进来」，而是**调用方在安全点临时填好的一份值清单**。

为什么不是注册式：xl 的 `Array<T>` 在非托管目标是**值语义**（C++ 的 `std::vector` 按值），
把「别人的数组」存进自己的字段就是一次**拷贝**——回收器随后扫的是一份再也不更新的快照，
却看起来像活着的数据。那是最坏的一种错：**测试会绿，线上会回收活对象**。
清单式没有这个问题：填清单的人就是持有根的人，扫完即弃。

代价是每次回收要抄一遍根（`O(根数)`）。回收本来就稀疏，**这笔账记在这里**。

**谁负责把根填全。**

| 根 | 从哪来 |
| --- | --- |
| 活跃帧的槽数组 | `frame.xl.md`：每个在跑的帧，逐槽 `AddValue` |
| 环境记录 | `frame.xl.md`：闭包捕获的那些格 |
| 待处理异常 | `vm.xl.md`：`try/catch` 正在展开时手上那个值 |
| 宿主 retain 表 | `host-abi.xl.md`：`Ts_Retain` 过、还没 `Ts_Release` 的句柄 |
| runtime 临时根栈 | `vm.xl.md`：`rt_*` 内部的临时值（非托管目标才真的压东西，见 §9） |
| **程序常量** | `ir-verify.xl.md` 的 `LoadedProgram.Values`：装载时物化，程序活着就一直活着 |

**漏一个根 = 把活对象当垃圾收掉。** 这类 bug 断言不出来（缺的那一格本来就不在清单里），
只能靠用例抓：`tests/runtime/check.mjs` 里「活对象必须活下来」那一组
（对象 / 数组元素 / 原型 / 闭包环境 / 符号描述 / 属性键）就是干这个的。

**安全点。**

回收**只在**调用方已经凑齐一份完整 `RootSet` 的地方跑：分配前（`BeforeAllocate`）
与宿主显式要求（`Ts_Collect` → `Collect`）。这条之所以成立，是因为
`rt_call` 的参数与结果**都是槽号**（`ir.xl.md`）——引擎里没有「只活在宿主局部变量里」的
对象，所以凑根永远不会漏。

**回收器内部不分配**（标记栈是复用的成员数组）。在回收里分配是最经典的自我引用陷阱：
分配可能触发回收。

# const DefaultHeadroom:int = 1048576

回收阈值相对存活量的余量（计费字节）。回收之后按 `存活 + 余量` 设下一次的阈值——
固定余量而不是倍增：GC 频率与分配量成正比，行为可预测，也让「同 IR + 同输入 = 同输出」好推理。

# const MinHeapLimit:int = 65536

堆上限的最小值。上限比它小的话，任何脚本都会在第一条语句就 OOM——那不是配置，是 bug。

# class RootSet

**一份根快照**（在安全点上填好、扫完即弃）。

`Values` 是带标签的值（回收器自己看 `IsRef` 决定要不要跟），`Handles` 是纯句柄
（宿主 retain 表与临时根栈用它）。

## field Values:Array<Value> = []

值形式的根。

## field Handles:Array<int> = []

句柄形式的根。

## method Clear:()=>void

清空。**复用同一份清单**（每次回收不必新建数组）。

```ts
this.Values = [];
this.Handles = [];
```

## method AddValue:(value:Value)=>void

加一个值根。非引用型加进来也无害（回收器会跳过），但**别加**——
清单是每次回收都要抄一遍的，白抄 O(根数)。

```ts
this.Values.push(value);
```

## method AddHandle:(handle:int)=>void

加一个句柄根。

```ts
this.Handles.push(handle);
```

## method Count:()=>int

根的总格数。给判据与调试用（比如断言「跑一个空脚本时根集不为空」）。

```ts
return this.Values.length + this.Handles.length;
```

# class Collector

回收器。

**一轮的次序是判据的一部分**，不能换：

1. **标记** —— 从根快照出发，顺出边走全图，把每个活对象打上 `Mark`；
2. **全量重算账** —— `RecountAll`（`heap.xl.md`）；分配路径只记了「分配时」的账，
   两次回收之间的载荷增长是**少记**的，这里补平；
3. **清扫** —— 没打标记的 `Retire`（它会退掉**刚重算出来的**账），活对象把 `Mark` 清回 `false`；
4. **调阈值** —— 按存活量设下一次的阈值。

第 2 步必须在第 3 步之前：`Retire` 退的是 `ChargedBytes`，而那个数正是第 2 步刚写上的。
反过来做，退的就是旧的、少记的数，账本会一路漂低。

**`Mark` 一位就够**，前提是清扫把活对象的标记清干净——否则下一次回收会把上一轮的活对象
当成已标记，一路漏到它变成垃圾也不收。`tests/runtime/check.mjs` 里「连着回收两轮、
活对象还在」那条就是钉它的。

## field Table:HeapTable

对象表。

## field HeapLimit:int = 65536

堆上限（计费字节）。`Charged` 超过它就是 OOM——但**必须在回收之后、用重算过的账**判，
否则会出现「明明还有垃圾可收，却先报了 OOM」。

## field NextThreshold:int = 0

下一次触发回收的账（计费字节）。

## field MarkStack:Array<int> = []

标记栈。**复用的成员数组**，不是每次新建——回收器内部不分配（见文首安全点一节）。

## field Cycles:int = 0

跑过的回收轮数。给判据用（断言「确实收过」而不是「碰巧没超阈值」）。

## field Collected:int = 0

上一轮收掉的格数。

## field LiveBytes:int = 0

上一轮回收**之后**的账（重算过的）。给判据与宿主查询用。

## constructor:(table:HeapTable, heapLimit:int)=>void

造回收器。上限低于 `MinHeapLimit` 就抬到它——不静默接受一个必然立刻 OOM 的配置。

```ts
this.Table = table;
if (heapLimit < MinHeapLimit) {
  this.HeapLimit = MinHeapLimit;
} else {
  this.HeapLimit = heapLimit;
}
if (DefaultHeadroom < this.HeapLimit) {
  this.NextThreshold = DefaultHeadroom;
} else {
  this.NextThreshold = this.HeapLimit;
}
this.MarkStack = [];
this.Cycles = 0;
this.Collected = 0;
this.LiveBytes = 0;
```

## method MarkValue:(value:Value, stack:Array<int>)=>void

把一个值形式的根（或出边）压进标记栈：非引用型直接跳过。

```ts
if (!value.IsRef()) return;
if (value.Ref <= 0) return;
stack.push(value.Ref);
```

## method MarkHandle:(handle:int, stack:Array<int>)=>void

把一个句柄压进标记栈。`0` 是「没有」的哨兵（`heap.xl.md`），负数不可能出现。

```ts
if (handle <= 0) return;
stack.push(handle);
```

## method Trace:(item:HeapObject, stack:Array<int>)=>void

一个对象的**出边**：原型、属性（键、值、取值器、赋值器）、数组元素、符号描述、
闭包的环境与名字、函数的名字。

字符串与宿主句柄没有出边——它们的载荷是内联的（不是句柄），所以不必跟。

```ts
if (item.Proto > 0) stack.push(item.Proto);
for (let i = 0; i < item.Props.length; i++) {
  const property = item.Props[i];
  if (property.Key > 0) stack.push(property.Key);
  this.MarkValue(property.Value, stack);
  this.MarkValue(property.Getter, stack);
  this.MarkValue(property.Setter, stack);
}
if (item.Sym !== null) {
  if (item.Sym.Description > 0) stack.push(item.Sym.Description);
}
if (item.Arr !== null) {
  const elements = item.Arr.Elements;
  for (let i = 0; i < elements.length; i++) {
    this.MarkValue(elements[i], stack);
  }
}
if (item.Closure !== null) {
  if (item.Closure.Env > 0) stack.push(item.Closure.Env);
  if (item.Closure.Name > 0) stack.push(item.Closure.Name);
}
if (item.Function !== null) {
  if (item.Function.Name > 0) stack.push(item.Function.Name);
}
if (item.Frame !== null) {
  if (item.Frame.Prev > 0) stack.push(item.Frame.Prev);
  if (item.Frame.Env > 0) stack.push(item.Frame.Env);
  if (item.Frame.Generator > 0) stack.push(item.Frame.Generator);
  // **挂起的 async 帧靠这两格活着**（第 285 轮）：它离开帧栈之后，
  // 指着它的就是「它自己的那个承诺」（`AsyncPromise`）与「它等的那个」（`Awaiting`）。
  // 漏了它们，症状是「某个 `await` 之后再也没醒过来」
  //（只在堆压满时出现，最难复现的一种）。
  if (item.Frame.AsyncPromise > 0) stack.push(item.Frame.AsyncPromise);
  this.MarkValue(item.Frame.Awaiting, stack);
  this.MarkValue(item.Frame.This, stack);
  // **`new.target` 那一格也是根**（第 346 轮）：它是一个**值**（构造函数本身），
  // 与 `This` 同一形状——漏了它，症状是「某个构造函数里 `new.target` 某一天空了」
  //（**只在回收之后出现**，最难复现的一种）。
  this.MarkValue(item.Frame.NewTarget, stack);
  this.MarkValue(item.Frame.ResumeValue, stack);
  for (let i = 0; i < item.Frame.Slots.length; i++) {
    this.MarkValue(item.Frame.Slots[i], stack);
  }
}
if (item.Generator !== null) {
  if (item.Generator.Frame > 0) stack.push(item.Generator.Frame);
  // **生成器的「完成值」也是根**（第 746 轮）：`it.return(obj)` 交出去的那个对象
  // 记在生成器身上（`HeapGenerator.CompletedValue`），而生成器自己**可能还在脚本手里**
  //（`yield* g()` 那一支正是这样：内层生成器跑完了，外层还要读它的完成值）。
  // 漏了它的症状与这一族的每一条一字不差：**某一天那个值被收走**，
  // 只在堆压满时出现。
  this.MarkValue(item.Generator.CompletedValue, stack);
}
if (item.Promise !== null) {
  this.MarkValue(item.Promise.Value, stack);
  for (let i = 0; i < item.Promise.Reactions.length; i++) {
    stack.push(item.Promise.Reactions[i]);
  }
}
if (item.Iterator !== null) {
  if (item.Iterator.Source > 0) stack.push(item.Iterator.Source);
}
if (item.Env !== null) {
  if (item.Env.Parent > 0) stack.push(item.Env.Parent);
  for (let i = 0; i < item.Env.Slots.length; i++) {
    this.MarkValue(item.Env.Slots[i], stack);
  }
}
```

## method Mark:(roots:RootSet)=>void

标记阶段：把根快照里的每一格压栈，然后**用显式的栈**把图走完。

**不用递归**：闭包链与原型链的深度由脚本决定，递归就等于把宿主栈交给脚本
（与 `vm.xl.md` 那条「`call` 不递归」同一条理由）。

**越界句柄与指向空格的句柄要抛**：它们不是「没有」（那是 `0`），而是**引擎或宿主的 bug**。
不抛的后果是把「回收了还活着的对象」悄悄放过去——那是类型混淆级的错，
而在这里抛出一个宿主异常只是把一个数据错误停在离现场最近的地方。

**抛出去之后回收器状态不可信**（标记位可能半途置上、标记栈非空）：调用方应当把它当成
**致命错误**，不要接着跑——根集里有 bug 这件事本身已经说明这一次执行无法自证正确，
继续跑只会把数据错误变成更难查的错。

```ts
this.MarkStack = [];
for (let i = 0; i < roots.Values.length; i++) {
  this.MarkValue(roots.Values[i], this.MarkStack);
}
for (let i = 0; i < roots.Handles.length; i++) {
  this.MarkHandle(roots.Handles[i], this.MarkStack);
}
while (this.MarkStack.length > 0) {
  const handle = PopInt(this.MarkStack);
  if (handle <= 0) continue;
  if (handle >= this.Table.Capacity()) throw new Error("root handle out of range: " + handle);
  const item = this.Table.Objects[handle];
  if (item.Tag === ValueTag.Undefined) throw new Error("root handle points at a free slot: " + handle);
  if (item.Mark) continue;
  item.Mark = true;
  this.Trace(item, this.MarkStack);
}
```

## method Sweep:()=>int

清扫阶段：从 1 扫到高水位（0 是哨兵），活对象清标记、死对象交还空闲链。

**顺序是判据**：先判 `Undefined`（空格）再判 `Mark`——空格本来就没有标记，
把它当死对象再 `Retire` 一次是无害但白费的（`Retire` 会静默早退）。

```ts
let freed = 0;
for (let handle = 1; handle < this.Table.Capacity(); handle++) {
  const item = this.Table.Objects[handle];
  if (item.Tag === ValueTag.Undefined) continue;
  if (item.Mark) {
    item.Mark = false;
    continue;
  }
  this.Table.Retire(handle);
  freed++;
}
return freed;
```

## method AdjustThreshold:()=>void

按存活量设下一次的阈值：`存活 + DefaultHeadroom`，但不超过堆上限。

```ts
const headroom = this.Table.Charged + DefaultHeadroom;
if (headroom < this.HeapLimit) {
  this.NextThreshold = headroom;
} else {
  this.NextThreshold = this.HeapLimit;
}
```

## method Collect:(roots:RootSet)=>int

跑完整的一轮，返回收掉的格数。次序见类说明（标记 → 重算账 → 清扫 → 调阈值）。

```ts
this.Mark(roots);
this.Table.RecountAll();
const freed = this.Sweep();
this.Cycles = this.Cycles + 1;
this.Collected = freed;
this.LiveBytes = this.Table.Charged;
this.AdjustThreshold();
return freed;
```

## method BeforeAllocate:(roots:RootSet, bytes:int)=>bool

分配前的闸门：**要不要回收、允不允许这一笔**。

`false` 表示「这一笔会把堆顶穿上限」——**它不是脚本异常**，回收器不认识脚本的
`RangeError`。由调用方（`vm.xl.md` 的分配助手）把它翻成一个**可捕获的脚本异常**，
宿主不死。

判据的顺序也是判据的一部分：**先按阈值决定收不收，收完再用重算过的账判上限**——
反过来的话，会出现「明明还有垃圾可收，却先报了 OOM」。

```ts
if (this.Table.Charged + bytes <= this.NextThreshold) return true;
this.Collect(roots);
if (this.Table.Charged + bytes > this.HeapLimit) return false;
return true;
```

## method OverLimit:()=>bool

当前账是否已经顶穿上限。给宿主与判据用（宿主可以在 `Ts_Call` 之间查它）。

```ts
return this.Table.Charged > this.HeapLimit;
```
