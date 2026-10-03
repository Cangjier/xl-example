# dependencies
```xl
import { Value } from "./value.xl.md"
import { HeapFrame, HeapTable } from "./heap.xl.md"
import { RootSet } from "./gc.xl.md"
```

# namespace cangjie

**帧栈**：执行期的调用栈。契约见 [docs/runtime-architecture.md](../docs/runtime-architecture.md) §7。

帧是**堆对象**（`HeapFrame`），这里只维护一个**句柄栈**。两条推论：

1. **「调用」= 压一个句柄**，不消耗宿主栈——脚本的递归深度撞的是**帧数上限**，
   不是宿主栈（宿主栈溢出不可捕获，那是拒绝服务面）；
2. **回收的根快照只需要交出这些句柄**（`AddRoots`），帧里的槽由回收器顺着载荷走
   （`gc.xl.md` 的 `Trace` 里有 `Frame` 那一支）。

**这一层不做分配的安全判断**：`Push` 会造一个堆对象，所以**调用方必须先在安全点上问过**
`Vm.NeedRoom`（凑根 + 预算）。顺序反过来，分配就会先撞上限——而上限撞上之后没有根可凑，
只能报 OOM。

**帧句柄 0 表示「没有帧」**（与堆的哨兵同一套约定），所以 `TopHandle` 空栈给 0。

# class FrameStack

帧栈。

## field Table:HeapTable

对象表（帧是堆对象）。

## field Handles:Array<int> = []

帧句柄，**下标即深度**（`Handles.length - 1` 是栈顶）。

## constructor:(table:HeapTable)=>void

造一个空栈。

```ts
this.Table = table;
this.Handles = [];
```

## method Depth:()=>int

当前深度（帧数）。异常表的 `FrameDepth` 与它同一套口径。

```ts
return this.Handles.length;
```

## method IsEmpty:()=>bool

是否空栈。

```ts
return this.Handles.length === 0;
```

## method TopHandle:()=>int

栈顶句柄；空栈给 `0`。

```ts
if (this.Handles.length === 0) return 0;
return this.Handles[this.Handles.length - 1];
```

## method Current:()=>HeapFrame

栈顶帧；空栈要抛（**这条路径只可能来自引擎 bug**：机器在空栈上不该取「当前帧」）。

```ts
if (this.Handles.length === 0) throw new Error("frame stack is empty");
return this.Table.Get(this.Handles[this.Handles.length - 1]).AsFrame();
```

## method AtDepth:(depth:int)=>HeapFrame

第 `depth` 层（`0` 是最早那一帧）的帧。给判据与调试用。

```ts
if (depth < 0 || depth >= this.Handles.length) throw new Error("frame depth out of range: " + depth);
return this.Table.Get(this.Handles[depth]).AsFrame();
```

## method Push:(code:int, slotCount:int, returnSlot:int)=>int

压一帧，返回新帧的句柄。新帧的 `Prev` 就是压之前的栈顶——**调用链靠它串起来**，
不必另存一份「返回地址栈」。

**`Pc` 从入口开始**（`code` 就是入口下标）：帧开出来就该是「准备执行这个函数的第一条」。
放在这里设而不是让 `Start` 与 `DoCallValue` 各自记得设——**两处都记得，就总有一天有一处忘了**
（实测忘记的那一次：被调方从 `Pc = 0` 开始，于是又跑了一遍调用者的第一条指令）。

**调用方必须先问过 `Vm.NeedRoom`**（见文首）。

```ts
const prev = this.TopHandle();
const handle = this.Table.CreateFrame(code, slotCount, prev, returnSlot);
this.Table.Get(handle).AsFrame().Pc = code;
this.Handles.push(handle);
return handle;
```

## method PushExisting:(handle:int, returnSlot:int)=>void

把一个**已经存在**的帧压回栈上——生成器恢复就用它。

它**不动** `Pc` / `Env` / `This` / `Slots`：那些是挂起时冻住的状态，恢复就是「接着跑」。
它只换 **`ReturnSlot`**：这一次的返回值要交给**这次**恢复它的人。

（`Push` 是「开一帧新的」，这一步是「把旧的放回去」——两件事不合并，
因为合起来就得在里面判「这帧是新的还是旧的」，而那个判据每个调用点都要重复一遍。）

```ts
if (!this.Table.IsValid(handle)) throw new Error("invalid frame handle: " + handle);
this.Table.Get(handle).AsFrame().ReturnSlot = returnSlot;
this.Handles.push(handle);
```

## method PushBack:(handle:int)=>void

把一个已经存在的帧压回栈上，**不动它的 `ReturnSlot`**——微任务（`await` 的恢复）用它。

**它和 `PushExisting` 的差别就是「回哪儿去」**：生成器恢复时，这一次的产出要交给
**这次调 `next()` 的人**（所以换 `ReturnSlot`）；而 `await` 的恢复是**同一个调用**接着跑，
它的返回值该回到**原先那个地方**（栈底的入口函数 → `Result`，或者它的调用者某一格）。

把这一格改掉的话，`await` 之后函数返回的值会走进「原生返回」通道、**入口函数的返回值就丢了**
（这一条是被判据抓出来的）。

```ts
if (!this.Table.IsValid(handle)) throw new Error("invalid frame handle: " + handle);
this.Handles.push(handle);
```

## method Pop:()=>int

弹一帧，返回被弹出的句柄；空栈给 `0`。

**弹出去之后调用方不许再用那个帧的字段**（它随时可能被回收复用）——要读就先读。

```ts
if (this.Handles.length === 0) return 0;
const handle = this.Handles.pop();
if (handle === undefined) return 0;
return handle;
```

## method AddRoots:(roots:RootSet)=>void

把每一帧的句柄加进根快照。**每一帧都要加**，不只是栈顶：
调用链上的每一帧都持有活值（调用者的槽里存着中间结果）。

```ts
for (let i = 0; i < this.Handles.length; i++) {
  roots.AddHandle(this.Handles[i]);
}
```

## method Clear:()=>void

清空（停机、宿主重置时用）。**不回收帧本身**——那是回收器的活。

```ts
this.Handles = [];
```
