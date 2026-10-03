# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapFrame, HeapTable, ObjectCharge, ValueCharge, GeneratorState, PromiseState } from "./heap.xl.md"
import { Collector, RootSet } from "./gc.xl.md"
import { Program, Instruction, Op, RtOpName, RtOp, FunctionInfo, BuiltinBase } from "./ir.xl.md"
import { IdTable, LoadedProgram, Load } from "./ir-verify.xl.md"
import { FrameStack } from "./frame.xl.md"
import { RtAdd, RtSub, RtMul, RtDiv, RtMod, RtNeg, RtNot } from "./rt.xl.md"
import { RtCmpLt, RtCmpLe, RtCmpGt, RtCmpGe, RtCmpEqStrict, RtCmpEqLoose, RtToBoolean, RtIsNullish } from "./rt.xl.md"
import { RtNewClosure, RoomChecker, RtToString, RtTypeOf } from "./rt.xl.md"
import { GetProperty, SetProperty, DeleteProperty, HasProperty, GetIndex, SetIndex } from "./props.xl.md"
import { NewPlainObject, NewPlainArray, InitProtos, Protos, NativeCall } from "./props.xl.md"
```

# namespace cangjie

**分派循环**：把 IR 跑起来的那台机器。契约见
[docs/runtime-architecture.md](../docs/runtime-architecture.md) §5 / §7 / §9。

三条不能破的约定：

1. **`call` 不递归**。压帧 + `continue`——脚本的调用深度撞的是帧数上限，不是宿主栈。
2. **分配前必须凑根**。每一次会造堆对象的操作都要先走 `NeedRoom`：
   它按「帧句柄 + 程序常量 + 待处理异常」凑一份**完整的根快照**，再问回收器放不放行。
   少了这一步，回收器就会在根集不全的时候决定谁死。
3. **未实现的指令 / 算子要抛**，不许静默跳过。引擎停下来喊「我还不会」，
   比继续跑出一份看起来合理的错结果好得多。

# type ValueThunk = ()=>Value

一段「算出个值」的代码，给 `Guard` 用（见那一节）。

**右侧是原文**（`# type` 的规矩）：所以这里写的是宿主的类型写法，不是中立类型。

# type HostInvoker = (target:Value, self:Value, args:Array<Value>, room:RoomChecker)=>Value

**把一次宿主函数调用交给宿主**：`target` 是那个 `HostRef`（**它自己带着「是哪一个」
——`HostRef.CapabilityId`，内建方法就靠它分派**），`self` 是接收者（普通调用给 `undefined`），
`args` 是**拷过去**的参数数组（宿主拿不到 vm 的槽——那是「值语义」这条安全要求在 ABI 上的样子），
`room` 是「分配前问一句」的回调（**宿主函数要分配就必须问**，否则绕过资源预算）。

**返回值必须是一个完整的 `Value`**：宿主想长期留着它，得先 `Retain`
（`host-abi.xl.md` 的借用规矩）——回收器看不见宿主语言里的变量。

# const NativeReturnSlot:int = -2

**重入调用的返回标记**。被调方 `return` 时，结果不写回某一格，而是进 `Vm.NativeResult`
（重入的时候没有「调用者的槽」这个概念）。

取值不与普通槽号冲突：槽号非负，`-1` 是「没有调用者」（栈底）。
—— 一个「不是槽号」的负数就有了位置，**这就是为什么它借用了负数**。

# const MaxNativeDepth:int = 64

**重入深度上限**（安全第 4 层）。

脚本可以在 getter 里再读同一个属性，于是重入套重入。没有上限的话，
它是「栈溢出的另一种写法」——只不过撞的是帧数上限而不是宿主栈；有上限，
它变成一条**可捕获的宿主错误**，而不是把宿主拖死。

取 64 而不是更大：重入的每一步都要**真的**在宿主栈上跑一层
（`RunToDepth` 是从 `CallNative` 里调进去的），所以它确实消耗宿主栈。

# enum VmStatus

机器的状态。**宿主靠它分辨「跑完了」「被预算拦住了」「抛出去没人接」**——
这三种在宿主那一侧的处置完全不同。

- case Ready
还没开始，或者正在跑。
- case Halted
正常停机（帧栈空了，或者执行到 `halt`）。
- case Threw
脚本异常抛到了最外层，没人接。异常值在 `Vm.Pending` 里。
- case OutOfSteps
指令步数预算用尽。**不是脚本异常**，是资源上限（安全第 4 层）。
- case OutOfMemory
堆上限顶穿（回收过了，还是放不下）。同样不是脚本异常。

# class HandlerEntry

**一个在册的处理点**：`try_push` 那一刻记下来的东西。

**为什么记帧句柄而不是帧深度**：同一段代码在递归里每一层的帧深度都不同，
**静态值算不出来**（`ir.xl.md` 的 `Handler.FrameDepth` 是降级期写下的静态提示，
运行期以这里记的句柄为准）。展开时按「那一帧还在不在栈上」决定这个处理点还算不算数。

## field Frame:int = 0

`try_push` 时**当前帧**的句柄。

## field Pc:int = 0

出事时要跳到的指令（从异常表那一项抄下来）。

## constructor:(frame:int, pc:int)=>void

记一个处理点。

```ts
this.Frame = frame;
this.Pc = pc;
```

# class Vm

一台虚拟机：对象表 + 回收器 + 帧栈 + 一份装载好的程序。

**它一次只跑一份程序**（`Program` 是它的字段）。要同时跑多份，就是多台机器——
比在一台机器里塞多份程序的状态简单，也让「一份程序一个常量池」这条不变量成立。

## field Table:HeapTable

对象表。

## field Collector:Collector

回收器。

## field Program:LoadedProgram | null = null

装载好的程序；`null` 表示还没装。

## field Protos:Protos | null = null

**内建原型表**（普通对象 / 数组 / 函数三个空原型），装载时造。`null` 表示还没装。

**它是常驻根**：三个原型是所有对象的祖先，被收掉的话整棵原型链当场断掉
（`SnapshotRoots` 把它们加进去）。

## field Frames:FrameStack

帧栈。

## field Handlers:Array<HandlerEntry> = []

**在册的处理点**栈（`try_push` / `try_pop` 管它）。它只在运行期存在——异常表是静态的，
在册的处理点不是。

## field Pending:Value = new Value()

**待处理异常**：正在展开时手上那个值。它必须是回收的根（`SnapshotRoots` 把它加进去），
否则展开过程中它会被收掉。

## field Result:Value = new Value()

**入口函数的返回值**。最后一帧 `return` 出去时记在这里——宿主 `Start` + `Run` 之后
第一件想知道的就是它（`halt` 停机时结果留在槽里，见 `Execute` 那一条）。

与 `Pending` 同理，**它也必须是根**：返回值可能是个堆对象。

## field NativeResult:Value = new Value()

**重入调用的返回值**（`NativeReturnSlot` 那条通道）。每次重入前清空、读完再清空——
所以「被调方没回来」（脚本抛了）时读到的是 `undefined`，而不是上一次的残留。

**它也是根**：getter 可能返回一个堆对象。

## field NativeDepth:int = 0

当前重入深度。上限见 `MaxNativeDepth`。

## field Microtasks:Array<int> = []

**微任务队列**：等着跑的**帧句柄**（`await` 挂起来的那些）。

**它是 VM 自己的队列，不是宿主的 `async`**：宿主的 async 一进来，
「同 IR + 同输入 = 同输出」这条判据就没了，而且没有 async 运行时的 C++ 客户当场跑不了。

**它必须是根**：队列里的帧带着活值，而它们不在帧栈上（`SnapshotRoots` 把它们加进去）。

## field Retained:Array<int> = []

**宿主拿住的那些值的句柄**（`Retain` / `Release`）。

**为什么必须有它**：脚本停在 `await` 上时，那一帧只被承诺指着；如果宿主也拿着那个承诺
（通常正是它触发的），这整条链在回收器眼里**没有任何根**——一轮回收就会把挂起的脚本
连同承诺一起收掉。所以「宿主拿住」必须是一条**显式的根**，而不是靠宿主语言里那个引用
（回收器看不见宿主语言的变量）。

**它必须是根**（`SnapshotRoots` 加进去）。

## field HostTable:Array<Value> = []

**能力表**：内建 id → 宿主注册进来的 `HostRef`（下标是 `id - BuiltinBase`）。

装载时按 id 表的大小开好、**每格是空的 `Value`**；宿主随后用 `RegisterCapability` 填。
`host_call` 只在**这一格真的是 `HostRef`** 时才发出去——所以「白名单」是两层：

1. **装载验证**：`rt_call` 的那个 id 必须在 **id 表**里（不在就直接拒绝装载）；
2. **运行期**：这个 id 必须**真的注册过**（没注册就报「能力未注册」，而不是给个 `undefined`）。

**它必须是根**：注册进去的是堆对象。

## field Host:HostInvoker | null = null

宿主函数的调用通道；`null` 表示这台机器**不带宿主**（纯脚本）。
这时候遇到 `host_call` 就直接报错——**不许静默返回 `undefined`**。

## field Finished:bool = false

**入口函数到底返回了没有**。

`Halted` 这个词不够用：脚本停在 `await` 上时机器也是 `Halted`（帧不在栈上、等承诺），
宿主必须分得清「跑完了」和「挂着等别人兑现」。分不清的话，客户会拿到一个
`undefined` 却以为是结果——**`host-abi.xl.md` 里这两件事是两个不同的结局**。

**它必须是根**（`SnapshotRoots` 加进去）。

## method RegisterCapability:(id:int, target:Value)=>bool

宿主把一个 `HostRef` 注册到能力表的某一格。

**这一格是白名单本身**：没注册过的 id，脚本再怎么写也调不到（运行期会报「能力未注册」）。

```ts
if (id < BuiltinBase) return false;
const index = id - BuiltinBase;
if (index >= this.HostTable.length) return false;
this.HostTable[index] = target;
return true;
```

## method InstallHost:(invoker:HostInvoker)=>void

装上宿主函数的调用通道。**不装就等于这台机器不带宿主**。

```ts
this.Host = invoker;
```

## method Retain:(value:Value)=>void

宿主拿住一个引用型值：**它从此是根**，直到 `Release`。

**拿原始值（数字 / 布尔 / undefined 之类）是空操作**：它们不占堆，也就无所谓拿不拿。

```ts
if (!value.IsRef()) return;
this.Retained.push(value.Ref);
```

## method Release:(handle:int)=>void

归还一个根。**只去掉一个**（同一个值 retain 两次就要 release 两次）——
与「一份拿住对应一份归还」这条约定一致。

```ts
for (let i = 0; i < this.Retained.length; i++) {
  if (this.Retained[i] === handle) {
    this.Retained = this.RemoveIntAt(this.Retained, i);
    return;
  }
}
```

## method RemoveIntAt:(items:Array<int>, index:int)=>Array<int>

去掉第 `index` 格，返回新数组（与 `ShiftInt` 同一条理由：不原地改）。

```ts
const result: number[] = [];
for (let i = 0; i < items.length; i++) {
  if (i !== index) result.push(items[i]);
}
return result;
```

## field Roots:RootSet = new RootSet()

复用的根快照。**复用**是因为每次分配都要凑一次根，每次新建数组太浪费。

## field StepBudget:int = 0

指令步数预算（安全第 4 层）。

## field Steps:int = 0

已经执行的指令条数。给判据用（也能看出「这一段跑了多少步」）。

## field Status:VmStatus = VmStatus.Ready

当前状态。

## constructor:(table:HeapTable, heapLimit:int, stepBudget:int)=>void

造一台机器。上限与预算都在这里定死。

```ts
this.Table = table;
this.Collector = new Collector(table, heapLimit);
this.Frames = new FrameStack(table);
this.Handlers = [];
this.Pending = new Value();
this.Roots = new RootSet();
this.Result = new Value();
this.NativeResult = new Value();
this.NativeDepth = 0;
this.Microtasks = [];
this.Retained = [];
this.HostTable = [];
this.Host = null;
this.Finished = false;
this.StepBudget = stepBudget;
this.Steps = 0;
this.Status = VmStatus.Ready;
```

## method Code:()=>Program

取程序本体；没装载就抛（**引擎 bug**：没程序就不该有人跑指令）。

```ts
if (this.Program === null) throw new Error("no program loaded");
return this.Program.Code;
```

## method Load:(bytes:Array<int>, ids:IdTable)=>bool

装载一份程序（走 `ir-verify.xl.md` 那个唯一入口）。**换程序会把机器的运行状态清掉**：
帧栈与处理点属于上一份程序。

```ts
const loaded = Load(bytes, ids, this.Table);
if (loaded === null) return false;
this.Program = loaded;
this.Frames.Clear();
this.Handlers = [];
this.Pending = new Value();
this.Result = new Value();
this.Steps = 0;
this.Status = VmStatus.Ready;
this.Protos = null;
if (!this.NeedRoom(ObjectCharge * 4)) return false;
this.Protos = InitProtos(this.Room(), this.Table);
this.HostTable = [];
for (let i = 0; i < loaded.Ids.BuiltinCount; i++) {
  this.HostTable.push(new Value());
}
this.Finished = false;
return true;
```

## method SnapshotRoots:()=>void

凑一份**完整的**根快照。

三样东西缺一不可：

- **帧句柄**（每一帧，不只是栈顶——调用链上每一帧都持有活值）；
- **程序常量**（装载时物化的那些，它们跟着程序一直活着）；
- **待处理异常**（展开中手上那个值）。

**槽里那些值不用单独加**：它们挂在帧的载荷上，回收器顺着载荷走（`gc.xl.md` 的 `Trace`）。

```ts
this.Roots.Clear();
this.Frames.AddRoots(this.Roots);
if (this.Program !== null) this.Program.Roots(this.Roots);
if (this.Protos !== null) this.Protos.AddRoots(this.Roots);
if (this.Pending.IsRef()) this.Roots.AddValue(this.Pending);
if (this.Result.IsRef()) this.Roots.AddValue(this.Result);
if (this.NativeResult.IsRef()) this.Roots.AddValue(this.NativeResult);
for (let i = 0; i < this.Microtasks.length; i++) {
  this.Roots.AddHandle(this.Microtasks[i]);
}
for (let i = 0; i < this.Retained.length; i++) {
  this.Roots.AddHandle(this.Retained[i]);
}
for (let i = 0; i < this.HostTable.length; i++) {
  this.Roots.AddValue(this.HostTable[i]);
}
```

## method NeedRoom:(bytes:int)=>bool

**分配前的闸门**：凑根 → 问回收器。放行返回 `true`；`false` 表示顶穿上限
（状态被置成 `OutOfMemory`，宿主该收工了）。

顺序是判据：**先凑根再问**。反过来的话，回收器可能在根集不全的时候决定谁死——
那是最坏的一种错（测试会绿，线上会收掉活对象）。

```ts
this.SnapshotRoots();
if (this.Collector.BeforeAllocate(this.Roots, bytes)) return true;
this.Status = VmStatus.OutOfMemory;
return false;
```

## method Start:(functionIndex:int, args:Array<Value>)=>bool

**开一台新的执行**：为第 `functionIndex` 个函数建入口帧，把实参放进前几格。

返回 `false` 表示放不下（上限）。宿主拿到 `true` 之后调 `Run`。

```ts
if (this.Program === null) throw new Error("no program loaded");
const functions = this.Program.Code.Functions;
if (functionIndex < 0 || functionIndex >= functions.length) {
  throw new Error("function index out of range: " + functionIndex);
}
const info = functions[functionIndex];
if (args.length > info.SlotCount) return false;
if (!this.NeedRoom(ObjectChargeGuess(info.SlotCount))) return false;
const handle = this.Frames.Push(info.Entry, info.SlotCount, -1);
const frame = this.Table.Get(handle).AsFrame();
for (let i = 0; i < args.length; i++) {
  frame.Slots[i] = args[i];
}
this.Result = new Value();
this.Steps = 0;
this.Status = VmStatus.Ready;
this.Finished = false;
return true;
```

## method StartClosure:(callee:Value, args:Array<Value>)=>bool

**按值开一台执行**：`callee` 是个闭包值，用它的代码与环境开入口帧。

**为什么需要它**：`Start` 是按**函数表下标**开帧的，那种帧**没有环境**——
所以一个「引用了模块作用域变量」的函数根本没法从宿主那边调起来（它的 `env_get`
会撞上「这一帧没有环境」）。真模型里宿主调的是一条**闭包**：它带着模块的环境出生，
所以它跑起来时环境是齐的。

- `ReturnSlot` 给 `-1`（它没有调用者，返回时值进 `Result`）；
- 参数拷进前几格（与 `DoCallValue` 同一条约定）；
- **`this` 给 `undefined`**（不是方法调用）。

**生成器函数在这一条路上也只造对象**：调用生成器函数**永远不跑体**——
这一点与调用方式无关。宿主调它拿到的就是那个**生成器对象**，
之后用 `DoIterNext` 推它（`DoIterNext` 是给宿主用的推进入口）。
少了这一条分支，宿主直调生成器函数会开出一个**普通帧**，
体里那对 `suspend` / `resume` 落在普通帧上——报的是 `suspend outside a generator`。

```ts
if (this.Program === null) throw new Error("no program loaded");
if (callee.Tag !== ValueTag.Closure) throw new Error("start needs a closure value");
const closure = this.Table.Get(callee.Ref).AsClosure();
const info = FunctionAtEntry(this.Code(), closure.Code);
if (info === null) throw new Error("closure points at no function: " + closure.Code);
if (info.IsGenerator) {
  return this.StartGenerator(callee, args);
}
if (!this.NeedRoom(ObjectChargeGuess(info.SlotCount))) return false;
const handle = this.Frames.Push(closure.Code, info.SlotCount, -1);
const frame = this.Table.Get(handle).AsFrame();
frame.Env = closure.Env;
for (let i = 0; i < args.length; i++) {
  frame.Slots[i] = args[i];
}
this.Result = new Value();
this.Steps = 0;
this.Status = VmStatus.Ready;
this.Finished = false;
return true;
```

## method Run:()=>VmStatus

**跑到底**：帧栈空（或者 `halt`）才停。它就是 `RunToDepth(0)`。

```ts
return this.RunToDepth(0);
```

## method RunToDepth:(depth:int)=>VmStatus

**分派循环**，跑到帧栈回到 `depth` 为止。

`Run` 是 `depth = 0` 那一档；**重入**（访问器与将来的内建方法）用 `depth ≥ 1` 跑
「跑到我这一层回来」——这就是 native 重入的**全部机关**：同一台循环、多一个停机条件。

每一条指令：先前进（`frame.Pc = pc + 1`），再执行——**跳转指令自己覆盖 `Pc`**。
这样「顺序执行」是默认，跳转是例外，指令实现里不必每条都写一次「pc 加一」。

```ts
if (this.Program === null) throw new Error("no program loaded");
this.Status = VmStatus.Ready;
while (this.Status === VmStatus.Ready) {
  if (this.Frames.Depth() <= depth) {
    if (depth === 0 && this.Frames.IsEmpty()) this.Status = VmStatus.Halted;
    break;
  }
  if (this.Steps >= this.StepBudget) {
    this.Status = VmStatus.OutOfSteps;
    break;
  }
  this.Steps = this.Steps + 1;
  const frame = this.Frames.Current();
  const pc = frame.Pc;
  frame.Pc = pc + 1;
  this.Execute(frame, this.Code().At(pc));
}
return this.Status;
```

## method Execute:(frame:HeapFrame, instr:Instruction)=>void

执行一条指令。**用 `if` 链而不是 `switch`**：与仓库其余部分同一形状，
而且「哪些指令还没实现」在末尾那一条抛错里一眼可见。

**`halt` 不动帧栈**：停机之后宿主（与判据）还要看最后一帧的样子——结果就在它的槽里。
清帧栈的是下一次 `Load` 或 `Start`。

```ts
if (instr.Op === Op.Halt) {
  this.Status = VmStatus.Halted;
  return;
}
if (instr.Op === Op.Const) {
  if (this.Program === null) throw new Error("no program loaded");
  frame.Slots[instr.A] = this.Program.ValueOf(instr.B);
  return;
}
if (instr.Op === Op.Move) {
  frame.Slots[instr.A] = frame.Slots[instr.B];
  return;
}
if (instr.Op === Op.Jump) {
  frame.Pc = instr.B;
  return;
}
if (instr.Op === Op.JumpIfFalse) {
  if (!frame.Slots[instr.A].AsBool()) frame.Pc = instr.B;
  return;
}
if (instr.Op === Op.Return) {
  this.DoReturn(frame, instr);
  return;
}
if (instr.Op === Op.Throw) {
  this.DoThrow(frame.Slots[instr.A]);
  return;
}
if (instr.Op === Op.TryPush) {
  this.Handlers.push(new HandlerEntry(this.Frames.TopHandle(), this.Code().Handlers[instr.A].HandlerPc));
  return;
}
if (instr.Op === Op.TryPop) {
  this.Handlers.pop();
  return;
}
if (instr.Op === Op.Caught) {
  frame.Slots[instr.A] = this.Pending;
  return;
}
if (instr.Op === Op.EnvNew) {
  if (!this.NeedRoom(ObjectCharge + instr.B * ValueCharge)) return;
  const handle = this.Table.CreateEnv(instr.B, frame.Env);
  frame.Env = handle;
  frame.Slots[instr.A] = Value.FromObject(handle);
  return;
}
if (instr.Op === Op.EnvGet) {
  const env = this.WalkEnv(frame.Env, instr.B);
  const slots = this.Table.Get(env).AsEnv().Slots;
  if (instr.C >= slots.length) throw new Error("environment index out of range: " + instr.C);
  frame.Slots[instr.A] = slots[instr.C];
  return;
}
if (instr.Op === Op.EnvSet) {
  const env = this.WalkEnv(frame.Env, instr.B);
  const slots = this.Table.Get(env).AsEnv().Slots;
  if (instr.C >= slots.length) throw new Error("environment index out of range: " + instr.C);
  slots[instr.C] = frame.Slots[instr.A];
  return;
}
if (instr.Op === Op.RtCall) {
  frame.Slots[instr.B] = this.RunRtOp(frame, instr);
  return;
}
if (instr.Op === Op.Call || instr.Op === Op.CallValue) {
  this.DoCallValue(frame, frame.Slots[instr.A], instr.B, instr.C, instr.B, Value.Undefined(), 0);
  return;
}
if (instr.Op === Op.CallMethod) {
  this.DoCallMethod(frame, instr);
  return;
}
if (instr.Op === Op.New) {
  this.DoNew(frame, instr);
  return;
}
if (instr.Op === Op.LoadThis) {
  frame.Slots[instr.A] = frame.This;
  return;
}
if (instr.Op === Op.Suspend) {
  this.DoSuspend(frame, instr);
  return;
}
if (instr.Op === Op.Resume) {
  frame.Slots[instr.A] = frame.ResumeValue;
  return;
}
if (instr.Op === Op.Await) {
  this.DoAwait(frame, instr);
  return;
}
throw new Error("unimplemented: opcode " + instr.OpName());
```

## method TakePending:()=>Value

取走待处理异常（读一次就清）。**`catch` 的降级要用它**：
处理点那边的第一件事就是把异常值拿到手，拿完就不该再留着（留着就是一个多余的根）。

```ts
const value = this.Pending;
this.Pending = new Value();
return value;
```

## method DoReturn:(frame:HeapFrame, instr:Instruction)=>void

返回：把值写到**调用者的参数基址**（`frame.ReturnSlot`），然后弹帧。

**构造调用的收尾也在这里**：`ConstructTarget > 0` 时按 JS 的规矩——构造函数**返回了对象**
就用那个对象，否则用当初造出来的那个（`DoNew` 给的）。少了这一条，`new` 出来的东西
就不是 JS 语义里的那个（`function C() { return {a: 1} }` 会被丢掉）。

**先把要读的都读出来，再弹帧**——弹出去的帧随时可能被回收复用，它的字段当场失效。

```ts
let value = Value.Undefined();
if (instr.A >= 0) value = frame.Slots[instr.A];
const returnSlot = frame.ReturnSlot;
const constructTarget = frame.ConstructTarget;
this.Frames.Pop();
if (constructTarget > 0) {
  if (!value.IsObject()) value = Value.FromObject(constructTarget);
}
if (returnSlot === NativeReturnSlot) {
  this.NativeResult = value;
  return;
}
if (this.Frames.IsEmpty()) {
  this.Result = value;
  this.Finished = true;
  this.Status = VmStatus.Halted;
  return;
}
if (returnSlot >= 0) {
  this.Frames.Current().Slots[returnSlot] = value;
}
```

## method DoCallValue:(frame:HeapFrame, callee:Value, argBase:int, argc:int, returnSlot:int, thisValue:Value, constructTarget:int)=>void

调用一个值。**两种被调方**：闭包（压帧，控制权回循环）与**宿主函数**（直接调、直接拿回值）。

**宿主函数这条路是「内建方法」的落点**：`arr.push(x)` 里的 `push` 是一个 `HostRef`
（由语言层装到原型上，见 `typescript-exec/builtins/`）。它**不压帧**——宿主函数是
同步的一小段，调用约定里「结果落回参数基址」在这里直接成立（写进 `returnSlot`）。

**`self` 就是接收者**：普通调用给 `undefined`，`call_method` 给接收者——
`arr.push` 里的 `arr` 正是这么进去的。

**`room` 一并交出去**（`host-abi.xl.md` 的调用通道）：内建方法要分配，
而**分配必须在「问过上限」之后**——宿主函数不拿到这个回调，就等于绕过资源预算。

**参数是拷过去的**：调用者的槽与被调方看到的是两块内存；「结果落回参数基址」那条约定
（`ir.xl.md`）只在**返回时**写回，中间那段窗口不该被被调方看见或改动。

**`this` 与 `constructTarget` 由调用者决定**：普通调用给 `undefined` 与 `0`；
`call_method` 给接收者；`new` 给新对象（两个都给）。它们都只影响**新帧**，不影响调用者。

**放不下就停**：`NeedRoom` 失败时状态已经是 `OutOfMemory`，这里直接返回让循环退出。
**不许「先开帧再问」**——那等于把上限判断交给运气。

**`call` 不递归**：闭包这条路只压帧，控制权回到 `Run` 的循环。深度 5000 的递归因此
撞的是帧数上限，不是宿主栈（判据里有那一条）。宿主函数那条路是**调用方等它返回**的
（它没有自己的帧，也就没有「挂起」这回事）。

```ts
if (callee.Tag === ValueTag.HostRef) {
  const invoker = this.Host;
  if (invoker === null) throw new Error("calling a host function with no host installed");
  const args: Value[] = [];
  for (let i = 0; i < argc; i++) {
    args.push(frame.Slots[argBase + i]);
  }
  const produced = invoker(callee, thisValue, args, this.Room());
  if (returnSlot >= 0) {
    frame.Slots[returnSlot] = produced;
  } else {
    this.Result = produced;
    this.Finished = true;
    this.Status = VmStatus.Halted;
  }
  return;
}
if (callee.Tag !== ValueTag.Closure) {
  throw new Error("unimplemented: calling a non-closure value");
}
const closure = this.Table.Get(callee.Ref).AsClosure();
const info = FunctionAtEntry(this.Code(), closure.Code);
if (info === null) {
  throw new Error("closure points at no function: " + closure.Code);
}
// **生成器函数不在这里跑**：调用它只造一个生成器对象（帧开好但不上栈）。
if (info.IsGenerator) {
  if (!this.NeedRoom(ObjectCharge * 2 + info.SlotCount * ValueCharge)) return;
  const createdHandle = this.Table.CreateFrame(closure.Code, info.SlotCount, 0, -1);
  const created = this.Table.Get(createdHandle).AsFrame();
  created.Pc = closure.Code;
  created.Env = closure.Env;
  created.This = thisValue;
  for (let i = 0; i < argc; i++) {
    created.Slots[i] = frame.Slots[argBase + i];
  }
  const generatorHandle = this.Table.CreateGenerator(createdHandle);
  created.Generator = generatorHandle;
  if (returnSlot >= 0) frame.Slots[returnSlot] = Value.FromObject(generatorHandle);
  return;
}
if (!this.NeedRoom(ObjectCharge + info.SlotCount * ValueCharge)) return;
const handle = this.Frames.Push(closure.Code, info.SlotCount, returnSlot);
const created = this.Table.Get(handle).AsFrame();
created.Env = closure.Env;
created.This = thisValue;
created.ConstructTarget = constructTarget;
for (let i = 0; i < argc; i++) {
  created.Slots[i] = frame.Slots[argBase + i];
}
```

## method StartGenerator:(callee:Value, args:Array<Value>)=>bool

**宿主直调生成器函数**：只造生成器对象，返回 `true`（帧不上栈）。

**为什么要单独一条**：`StartClosure` 的调用者是宿主，没有「结果写回哪一格」这回事，
所以产出直接进 `Result`；而 `DoCallValue` 那条要有调用者的帧可取参数。
**两处造生成器对象的动作一样，前置不一样**——所以这里自己走一遍，
而不是把两种前置硬塞进一个函数的分支里。

```ts
if (this.Program === null) throw new Error("no program loaded");
const closure = this.Table.Get(callee.Ref).AsClosure();
const info = FunctionAtEntry(this.Code(), closure.Code);
if (info === null) throw new Error("closure points at no function: " + closure.Code);
if (!this.NeedRoom(ObjectCharge * 2 + info.SlotCount * ValueCharge)) return false;
const createdHandle = this.Table.CreateFrame(closure.Code, info.SlotCount, 0, -1);
const created = this.Table.Get(createdHandle).AsFrame();
created.Pc = closure.Code;
created.Env = closure.Env;
created.This = Value.Undefined();
for (let i = 0; i < args.length; i++) {
  created.Slots[i] = args[i];
}
const generatorHandle = this.Table.CreateGenerator(createdHandle);
created.Generator = generatorHandle;
this.Result = Value.FromObject(generatorHandle);
// **不改 `Finished` / `Status`**：造一个生成器对象**不是「执行结束」**——
// 把它当成结束，后面的 `DoIterNext` 就推不动了（`RunToDepth` 一看「已结束」就收工；
// 判据报的是「产出是 undefined」，而真正的问题是**这次调用谎报了结束**）。
return true;
```

## method DoCallMethod:(frame:HeapFrame, instr:Instruction)=>void

`call_method`：在接收者上找那个方法，然后**用接收者当 `this`** 调它。

**`this` 是接收者，不是方法的拥有者**：继承来的方法被 `obj.m()` 调用时，`this` 仍然是
`obj`——这与「属性查找最后落在谁身上」无关。这一条写反的话，`this.x = 1` 会落到父类的
实例上（原型污染的另一半）。

```ts
if (this.Program === null) throw new Error("no program loaded");
const receiver = frame.Slots[instr.A];
const key = this.Program.ValueOf(instr.B);
if (this.Protos === null) throw new Error("no prototype table");
const callee = GetProperty(this.Room(), this.Native(), this.Protos, this.Table, receiver, key);
this.DoCallValue(frame, callee, instr.C, instr.D, instr.C, receiver, 0);
```

## method DoNew:(frame:HeapFrame, instr:Instruction)=>void

`new`：造对象 → 拿它当 `this` 调构造函数 → 返回时按 JS 规矩收尾（`DoReturn` 里的
「构造函数返回了对象就用它」）。

**原型今天取 `Protos.Object`**：真正的语义要读构造函数的 `prototype` **属性**，
而那个属性名（`"prototype"`）是 JS 语义的字符串——它属于语言的建库层（那一层把
`prototype` 放进闭包的属性表）。在它接上之前，这里给一个**明确、可预期**的答案，
而不是猜一个。`ConstructTarget` 保证「构造函数自己造了对象就用那个」这条**今天就是对的**。

```ts
if (this.Program === null) throw new Error("no program loaded");
const protos = this.Protos;
if (protos === null) throw new Error("no prototype table");
const callee = frame.Slots[instr.A];
const created = this.Guard(() => NewPlainObject(this.Room(), this.Table, protos));
if (!created.IsRef()) return;
this.DoCallValue(frame, callee, instr.B, instr.C, instr.B, created, created.Ref);
```

## method DoThrow:(value:Value)=>void

展开：找最近一个**还算数**的处理点，把帧退到它那一层，跳过去。

「还算数」= 记下来的那一帧**还在栈上**（`DepthOfFrame` 给的不是 -1）。不在的那些是在展开
之前就退出去了的处理点（`try_pop` 没来得及跑，或者 frame 已经被 `return` 弹掉），直接作废。

**一个处理点都不剩**就把状态置成 `Threw`——异常值留在 `Pending` 里给宿主。

```ts
this.Pending = value;
while (this.Handlers.length > 0) {
  const entry = this.Handlers[this.Handlers.length - 1];
  this.Handlers.pop();
  const depth = this.DepthOfFrame(entry.Frame);
  if (depth < 0) continue;
  while (this.Frames.Depth() > depth + 1) {
    this.Frames.Pop();
  }
  this.Frames.Current().Pc = entry.Pc;
  return;
}
// **一个处理点都不剩：异常要冒到宿主，帧栈必须清空。**
//
// 留着那些死帧，宿主下一次调用会压在它们上面：被调方返回时 `Frames.IsEmpty()`
// 是假，于是返回值写进了**死帧的槽**——宿主导到的结果是 `undefined`，
// 而「错」离现场几百条指令（判据报的是「`finally` 里的写读回来还是 0」）。
this.Frames.Clear();
this.Status = VmStatus.Threw;
```

## method DepthOfFrame:(handle:int)=>int

帧句柄在栈上的深度；不在栈上给 `-1`。

线性扫——栈深由帧数上限管着，而这条路径只在**抛异常**时走，不是热路径。

```ts
const handles = this.Frames.Handles;
for (let i = 0; i < handles.length; i++) {
  if (handles[i] === handle) return i;
}
return -1;
```

## method RunRtOp:(frame:HeapFrame, instr:Instruction)=>Value

走 `rt_call`：按 id 分派到 `rt.xl.md` 的算子。

**arity 在这里查**（`rt.xl.md` 文首那条）：id 表不带签名，验证层查不出「`add` 传了三个参数」，
所以每个算子自己验。参数个数不对是**降级层的 bug**，走宿主错误。

```ts
const argc = instr.D;
const base = instr.C;
const slots = frame.Slots;
if (base < 0 || argc < 0 || base + argc > slots.length) {
  throw new Error("rt_call argument window out of range");
}
const id = instr.A;
if (id === RtOp.Add) {
  RequireArgc(argc, 2, "add");
  return this.Guard(() => RtAdd(this.Room(), this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.Sub) {
  RequireArgc(argc, 2, "sub");
  return RtSub(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.Mul) {
  RequireArgc(argc, 2, "mul");
  return RtMul(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.Div) {
  RequireArgc(argc, 2, "div");
  return RtDiv(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.Mod) {
  RequireArgc(argc, 2, "mod");
  return RtMod(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.Neg) {
  RequireArgc(argc, 1, "neg");
  return RtNeg(this.Table, slots[base]);
}
if (id === RtOp.Not) {
  RequireArgc(argc, 1, "not");
  return RtNot(this.Table, slots[base]);
}
if (id === RtOp.CmpLt) {
  RequireArgc(argc, 2, "cmp_lt");
  return RtCmpLt(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.CmpLe) {
  RequireArgc(argc, 2, "cmp_le");
  return RtCmpLe(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.CmpGt) {
  RequireArgc(argc, 2, "cmp_gt");
  return RtCmpGt(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.CmpGe) {
  RequireArgc(argc, 2, "cmp_ge");
  return RtCmpGe(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.CmpEqStrict) {
  RequireArgc(argc, 2, "cmp_eq_strict");
  return RtCmpEqStrict(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.CmpEqLoose) {
  RequireArgc(argc, 2, "cmp_eq_loose");
  return RtCmpEqLoose(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.ToBoolean) {
  RequireArgc(argc, 1, "to_boolean");
  return RtToBoolean(this.Table, slots[base]);
}
if (id === RtOp.IsNullish) {
  RequireArgc(argc, 1, "is_nullish");
  return RtIsNullish(this.Table, slots[base]);
}
if (id === RtOp.NewClosure) {
  RequireArgc(argc, 2, "new_closure");
  return this.MakeClosure(slots[base], slots[base + 1].AsInt());
}
if (id === RtOp.GetProp) {
  RequireArgc(argc, 2, "get_prop");
  if (this.Protos === null) throw new Error("no prototype table");
  return GetProperty(this.Room(), this.Native(), this.Protos, this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.SetProp) {
  RequireArgc(argc, 3, "set_prop");
  return this.Guard(() => SetProperty(this.Room(), this.Native(), this.Table, slots[base], slots[base + 1], slots[base + 2]));
}
if (id === RtOp.DelProp) {
  RequireArgc(argc, 2, "del_prop");
  if (!slots[base].IsObject()) throw new Error("unimplemented: delete on a primitive receiver");
  return Value.FromBool(DeleteProperty(this.Table, slots[base].Ref, slots[base + 1]));
}
if (id === RtOp.GetIndex) {
  RequireArgc(argc, 2, "get_index");
  return GetIndex(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.SetIndex) {
  RequireArgc(argc, 3, "set_index");
  return this.Guard(() => SetIndex(this.Room(), this.Table, slots[base], slots[base + 1], slots[base + 2]));
}
if (id === RtOp.NewObject) {
  RequireArgc(argc, 0, "new_object");
  const protos = this.Protos;
  if (protos === null) throw new Error("no prototype table");
  return this.Guard(() => NewPlainObject(this.Room(), this.Table, protos));
}
if (id === RtOp.NewArray) {
  RequireArgc(argc, 0, "new_array");
  const protos = this.Protos;
  if (protos === null) throw new Error("no prototype table");
  return this.Guard(() => NewPlainArray(this.Room(), this.Table, protos));
}
if (id === RtOp.IterNew) {
  RequireArgc(argc, 1, "iter_new");
  const target = slots[base];
  if (!target.IsObject()) throw new Error("unimplemented: iterating a non-object");
  const item = this.Table.Get(target.Ref);
  if (item.Generator !== null) return target;
  if (target.Tag === ValueTag.Array) {
    return this.Guard(() => Value.FromObject(this.Table.CreateIterator(target.Ref)));
  }
  throw new Error("unimplemented: iter_new on this kind of object");
}
if (id === RtOp.IterNext) {
  RequireArgc(argc, 2, "iter_next");
  return this.DoIterNext(slots[base], slots[base + 1]);
}
if (id === RtOp.HostCall) {
  if (argc < 1) throw new Error("host_call needs a capability id");
  const idSlot = slots[base];
  if (!idSlot.IsNumber()) throw new Error("host_call capability id must be a number");
  const capId = idSlot.AsInt();
  if (capId < BuiltinBase) throw new Error("host_call id is not a capability: " + capId);
  const index = capId - BuiltinBase;
  if (index >= this.HostTable.length) throw new Error("capability id is out of range: " + capId);
  const target = this.HostTable[index];
  if (target.Tag !== ValueTag.HostRef) throw new Error("capability is not registered: " + capId);
  const invoker = this.Host;
  if (invoker === null) throw new Error("host_call with no host installed");
  const args: Value[] = [];
  for (let i = 1; i < argc; i++) {
    args.push(slots[base + i]);
  }
  return invoker(target, Value.Undefined(), args, this.Room());
}
if (id === RtOp.ToString) {
  RequireArgc(argc, 1, "to_string");
  return this.Guard(() => RtToString(this.Room(), this.Table, slots[base]));
}
if (id === RtOp.Typeof) {
  RequireArgc(argc, 1, "typeof");
  return this.Guard(() => RtTypeOf(this.Room(), this.Table, slots[base]));
}
if (id === RtOp.In) {
  RequireArgc(argc, 2, "in");
  if (!slots[base + 1].IsObject()) {
    throw new Error("unimplemented: 'in' needs an object on the right");
  }
  return Value.FromBool(HasProperty(this.Table, slots[base + 1].Ref, slots[base]));
}
throw new Error("unimplemented: rt op " + RtOpName(id));
```

## method Native:()=>NativeCall

把这台机器包成语义层要的那个回调（`props.xl.md` 的 `NativeCall`）。

**这是第二处适配**（第一处是 `Room`）：rt / props 不该认识 `Vm`，而 `Vm` 认识它们。

```ts
return (callee: Value, thisValue: Value, argument: Value, hasArgument: boolean) =>
  this.CallNative(callee, thisValue, argument, hasArgument);
```

## method CallNative:(callee:Value, thisValue:Value, argument:Value, hasArgument:bool)=>Value

**重入分派循环**调一个脚本函数，拿它的返回值。访问器（getter / setter）与将来内建方法
（`Array.prototype.map` 那种）只有这一条路。

三件事值得记住：

1. **深度上限**（`MaxNativeDepth`）：脚本可以在 getter 里再读同一个属性；没有上限就是
   栈溢出的另一种写法；
2. **结果走 `NativeReturnSlot`**：重入时没有「调用者的槽」，所以结果进 `NativeResult`；
3. **回来时状态可能已经被改**（脚本抛了、预算用尽）：那种情况下返回 `undefined`——
   **它的调用方（rt 算子）的结果会被丢掉，因为控制流已经不在那条指令上了**
   （展开把 `Pc` 改成了处理点）。这条推理让「重入期间出事」不需要额外清理。

```ts
if (callee.Tag !== ValueTag.Closure) {
  throw new Error("unimplemented: calling a non-closure value");
}
const closure = this.Table.Get(callee.Ref).AsClosure();
const info = FunctionAtEntry(this.Code(), closure.Code);
if (info === null) {
  throw new Error("closure points at no function: " + closure.Code);
}
if (this.NativeDepth >= MaxNativeDepth) {
  throw new Error("native re-entry is too deep: " + this.NativeDepth);
}
if (!this.NeedRoom(ObjectCharge + info.SlotCount * ValueCharge)) return Value.Undefined();
const depth = this.Frames.Depth();
this.NativeDepth = this.NativeDepth + 1;
this.NativeResult = new Value();
const handle = this.Frames.Push(closure.Code, info.SlotCount, NativeReturnSlot);
const frame = this.Table.Get(handle).AsFrame();
frame.Env = closure.Env;
frame.This = thisValue;
if (hasArgument) frame.Slots[0] = argument;
this.RunToDepth(depth);
this.NativeDepth = this.NativeDepth - 1;
const result = this.NativeResult;
this.NativeResult = new Value();
if (this.Status !== VmStatus.Ready) return Value.Undefined();
return result;
```

## method DoSuspend:(frame:HeapFrame, instr:Instruction)=>void

`suspend`：把当前帧冻住交给它的生成器，控制权回到**恢复它的人**。

- **值走 `NativeResult`**：恢复方（`DoIterNext`）就在等这个值，它拿到的就是这次 `next()`
  的产出；
- **帧从这里弹出去**：它不在栈上了，但生成器挂着它，所以**回收器照样看得见它**
  （`gc.xl.md` 顺着 `Generator.Frame` 走）；
- `Pc` 已经前进过（`Execute` 先前进再执行），所以恢复时接着跑的是 `suspend` 的**下一条**
  ——也就是降级层放在那儿的 `resume`。

```ts
const generatorHandle = frame.Generator;
if (generatorHandle <= 0) throw new Error("suspend outside a generator");
const value = frame.Slots[instr.A];
this.Table.Get(generatorHandle).AsGenerator().State = GeneratorState.Suspended;
this.Frames.Pop();
this.NativeResult = value;
```

## method DoIterNext:(iterator:Value, sent:Value)=>Value

`next(v)`：恢复一个挂起的生成器，返回一对 `[产出值, 是否结束]`。

**为什么返回一对数组、而不是 `{value, done}` 对象**：`done` / `value` 是 **JS 语义的名字**，
它们属于语言的建库层；`iter_next` 是**引擎级**算子，它的结果形状由降级层解释
（`get_index(pair, 0)` 取产出值、`get_index(pair, 1)` 取结束标志）——两条已有的指令就够，
**不必让引擎去认字符串键**。脚本可见的 `{value, done}` 由降级层自己拼（它有那些名字）。

**两种被迭代者在这里分派**（数组走游标、生成器走它自己）：分派在**引擎内部**按载荷做，
所以 `ir.xl.md` 不需要、也不该有「这是数组吗」这种指令——**降级层不必先判断类型**。

**数组的游标每次现问长度**：迭代期间 `push` 过就看得见（JS 的语义就是如此），
所以这里读的是**当下**的 `GetLength()`，而不是开始时记住的那个数。

**恢复 = 把冻住的帧压回栈上 + 跑到它再次挂起**：这就是全部机关，没有第二套执行器。

```ts
// **从宿主进来的入口要把瞬时状态清干净**：上一次调用结束时 `Finished` 是「真」、
// `Status` 是 `Halted`——那是**上一次**的结论。带着它进去，推进循环一步都不跑，
// 于是产出是 `undefined`（判据报的是「读不到这一对数组」，离现场很远）。
this.Finished = false;
this.Status = VmStatus.Ready;
if (!iterator.IsObject()) throw new Error("unimplemented: iterating a non-object");
const item = this.Table.Get(iterator.Ref);
if (item.Iterator !== null) {
  const cursor = item.Iterator;
  if (cursor.Source <= 0 || !this.Table.IsValid(cursor.Source)) {
    throw new Error("iterator without a source");
  }
  const source = this.Table.Get(cursor.Source);
  if (source.Tag !== ValueTag.Array) {
    throw new Error("unimplemented: iterating a non-array source");
  }
  const array = source.AsArray();
  const at = cursor.Index;
  if (at >= array.GetLength()) return this.MakeIterResult(Value.Undefined(), true);
  cursor.Index = at + 1;
  return this.MakeIterResult(array.GetAt(at), false);
}
if (item.Generator === null) {
  throw new Error("unimplemented: only generators and arrays can be iterated");
}
const generator = item.Generator;
if (generator.State === GeneratorState.Running) {
  throw new Error("unimplemented: this should throw a TypeError (generator is already running)");
}
if (generator.State === GeneratorState.Done) return this.MakeIterResult(Value.Undefined(), true);
if (this.NativeDepth >= MaxNativeDepth) {
  throw new Error("native re-entry is too deep: " + this.NativeDepth);
}
this.Table.Get(generator.Frame).AsFrame().ResumeValue = sent;
generator.State = GeneratorState.Running;
const depth = this.Frames.Depth();
this.NativeDepth = this.NativeDepth + 1;
this.NativeResult = new Value();
this.Frames.PushExisting(generator.Frame, NativeReturnSlot);
this.RunToDepth(depth);
this.NativeDepth = this.NativeDepth - 1;
const produced = this.NativeResult;
this.NativeResult = new Value();
if (this.Status !== VmStatus.Ready) return Value.Undefined();
if (generator.State === GeneratorState.Suspended) return this.MakeIterResult(produced, false);
generator.State = GeneratorState.Done;
return this.MakeIterResult(produced, true);
```

## method MakeIterResult:(value:Value, done:bool)=>Value

把「产出值 + 是否结束」做成一对数组（理由见 `DoIterNext`）。

```ts
const protos = this.Protos;
if (protos === null) throw new Error("no prototype table");
return this.Guard(() => {
  const pair = NewPlainArray(this.Room(), this.Table, protos);
  SetIndex(this.Room(), this.Table, pair, Value.FromInt(0), value);
  SetIndex(this.Room(), this.Table, pair, Value.FromInt(1), Value.FromBool(done));
  return pair;
});
```

## method DoAwait:(frame:HeapFrame, instr:Instruction)=>void

`await`：把当前帧挂到承诺上，等它结清。

- **已兑现的承诺也要推迟一个微任务**（JS 语义：`await` 至少让出一个 tick）——
  所以两条分支都做「悬起当前帧 + 把恢复排进队列」，只是**已兑现的立刻就能排**；
- **挂起就是弹出帧栈**（与 `suspend` 一样），恢复由 `DrainMicrotasks` 负责；
- **兑现值写进帧的 `ResumeValue`**：由紧跟其后的 `resume` 搬进槽里——与生成器同一套。

**拒绝的承诺还没有路**（那要错误对象那一层），所以遇到它抛宿主错误、把这一条明确记下来。

```ts
const target = frame.Slots[instr.A];
if (!target.IsObject()) throw new Error("unimplemented: awaiting a non-object");
const item = this.Table.Get(target.Ref);
if (item.Promise === null) throw new Error("unimplemented: awaiting a non-promise");
const promise = item.Promise;
if (promise.State === PromiseState.Rejected) {
  throw new Error("unimplemented: awaiting a rejected promise needs the error layer");
}
const handle = this.Frames.TopHandle();
this.Frames.Pop();
if (promise.State === PromiseState.Fulfilled) {
  frame.ResumeValue = promise.Value;
  this.Microtasks.push(handle);
  return;
}
promise.Reactions.push(handle);
```

## method ResolvePromise:(promise:Value, settled:Value)=>void

兑现一个承诺：记下值，把它等着的帧**全部排进微任务队列**。

**幂等**：已经结清的承诺再兑现一次是静默的（JS 的 `resolve` 也是这个行为）。

```ts
if (!promise.IsObject()) throw new Error("not a promise object");
const item = this.Table.Get(promise.Ref);
if (item.Promise === null) throw new Error("not a promise");
const promise2 = item.Promise;
if (promise2.State !== PromiseState.Pending) return;
promise2.State = PromiseState.Fulfilled;
promise2.Value = settled;
for (let i = 0; i < promise2.Reactions.length; i++) {
  const handle = promise2.Reactions[i];
  if (this.Table.IsValid(handle)) {
    this.Table.Get(handle).AsFrame().ResumeValue = settled;
    this.Microtasks.push(handle);
  }
}
promise2.Reactions = [];
```

## method DrainMicrotasks:()=>bool

把微任务队列跑干净。**宿主每跑完一次脚本调用都该调它一次**（`Ts_Call` 的收尾）。

每个微任务就是**一个挂起的帧**：压回栈上、跑到它再次挂起或返回。

- 它是**同一个调用接着跑**（与生成器不同），所以用 `PushBack`：**不动它的 `ReturnSlot`**
  ——入口函数返回时那个值才会照常落到 `Result` 上；
- 跑的过程中状态被改（脚本抛了、预算用尽）就**停下**，队列里剩下的留到下一次；
- 全跑完之后**把外层状态还原**：这一趟只是「顺手把微任务清了」，
  不该把「入口函数已经返回（`Halted`）」改写成 `Ready`。

```ts
const outer = this.Status;
while (this.Microtasks.length > 0) {
  const before: VmStatus = this.Status;
  if (before !== VmStatus.Ready && before !== VmStatus.Halted) return false;
  const handle = this.Microtasks[0];
  this.Microtasks = this.ShiftInt(this.Microtasks);
  if (!this.Table.IsValid(handle)) continue;
  const depth = this.Frames.Depth();
  this.NativeResult = new Value();
  this.Frames.PushBack(handle);
  this.RunToDepth(depth);
  const after: VmStatus = this.Status;
  if (after !== VmStatus.Ready && after !== VmStatus.Halted) return false;
}
this.Status = outer;
return true;
```

## method ShiftInt:(items:Array<int>)=>Array<int>

去掉第一个，返回新数组。

**不原地 `shift`**：那要挪后面所有格，而「返回新数组」在四个目标上写法一致
（`shift` 是某一个目标的库函数）。微任务队列都很短，**这笔开销记在这里**。

```ts
const result: number[] = [];
for (let i = 1; i < items.length; i++) {
  result.push(items[i]);
}
return result;
```

## method WalkEnv:(handle:int, depth:int)=>int

从 `handle` 起沿父链走 `depth` 层，返回那一层的环境句柄。

**链太短就抛**：层数是降级期算出来的词法坐标，链短了说明降级算错了——
这是引擎 bug，不是脚本的错，所以走宿主错误（与「环境下标越界」同一条道理：
环境的格数是动态的，验证层查不了，只能在这儿挡）。

```ts
let current = handle;
for (let i = 0; i < depth; i++) {
  if (current <= 0) throw new Error("environment chain is too short");
  const parent = this.Table.Get(current).AsEnv().Parent;
  if (parent <= 0) throw new Error("environment chain is too short");
  current = parent;
}
if (current <= 0) throw new Error("no environment in this frame");
return current;
```

## method Room:()=>RoomChecker

把「分配前问一句」包成 rt 层要的那个判据（`rt.xl.md` 的 `RoomChecker`）。

**这是一处适配**：rt 不该认识 `Vm`，而 `Vm` 认识它。

```ts
return (bytes: number) => this.NeedRoom(bytes);
```

## method Guard:(body:ValueThunk)=>Value

把 rt 层的 `out of room` 翻成机器的状态。

**两条路必须分开**：资源上限（`OutOfMemory`）与引擎 bug（异常冒出去）在宿主那一侧的
处置完全不同——把上限当成崩溃报出去，会让调用方以为引擎坏了。

```ts
try {
  return body();
} catch (error) {
  if (error instanceof Error && error.message === "out of room") {
    this.Status = VmStatus.OutOfMemory;
    return Value.Undefined();
  }
  throw error;
}
```

## method MakeClosure:(env:Value, code:int)=>Value

造闭包（走 `Guard`：它要分配）。

```ts
return this.Guard(() => RtNewClosure(this.Room(), this.Table, env, code));
```

# method RequireArgc:(actual:int, expected:int, name:string)=>void

参数个数不对就抛。名字进消息里——出问题时第一件想知道的就是**哪一个算子**。

```ts
if (actual !== expected) {
  throw new Error("rt op " + name + " expects " + expected + " arguments, got " + actual);
}
```

# method ObjectChargeGuess:(slotCount:int)=>int

开一帧之前对「要花多少计费字节」的估算。

它只是**闸门的输入**，不是账本本身：`Finish` 会按真实载荷结账，
多估一点只会让回收早一点点跑，少估一点则可能让一次分配刚好越界。
这里按「对象头 + 槽数 × 每个值」估，与 `HeapFrame.Charge` 同源——
**常量直接引用 `heap.xl.md` 的那两个**，不在本地再写一遍数字（写两遍就会有一天不一致）。

```ts
return ObjectCharge + slotCount * ValueCharge;
```

# method FunctionAtEntry:(program:Program, entry:int)=>FunctionInfo | null

按入口下标找函数表那一项（闭包的 `Code` 就是入口）。

**线性扫**：函数表在装载时按入口**严格升序**（`ir-verify.xl.md` 查过），所以这一趟能提前退出，
而且 v1 的函数表都很小。真要更快时换二分——**写这一句是因为它看起来「本来就该是二分」**，
免得以后有人在这儿反复怀疑。

```ts
for (let i = 0; i < program.Functions.length; i++) {
  if (program.Functions[i].Entry === entry) return program.Functions[i];
}
return null;
```
