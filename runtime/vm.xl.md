# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapFrame, HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge, GeneratorState, PromiseState } from "./heap.xl.md"
import { Collector, RootSet } from "./gc.xl.md"
import { Program, Instruction, Op, RtOpName, RtOp, FunctionInfo, BuiltinBase } from "./ir.xl.md"
import { IdTable, LoadedProgram, Load } from "./ir-verify.xl.md"
import { FrameStack } from "./frame.xl.md"
import { RtAdd, RtSub, RtMul, RtDiv, RtMod, RtNeg, RtNot, RtBitAnd, RtBitOr, RtBitXor, RtBitNot, RtShl, RtShr, RtUShr } from "./rt.xl.md"
import { RtCmpLt, RtCmpLe, RtCmpGt, RtCmpGe, RtCmpEqStrict, RtCmpEqLoose, RtToBoolean, RtIsNullish } from "./rt.xl.md"
import { RtNewClosure, RoomChecker, RtToString, RtTypeOf, RtSetProto, RtInstanceOf, RtChainHas, TextUnitsOf, TruthyOf } from "./rt.xl.md"
import { GetProperty, SetProperty, DeleteProperty, HasProperty, GetIndex, SetIndex, ArrayIndexAt, IsLengthKey } from "./props.xl.md"
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

# type ErrorFactory = (kind:number, text:string)=>Value

一段「算出个值」的代码，给 `Guard` 用（见那一节）。

**右侧是原文**（`# type` 的规矩）：所以这里写的是宿主的类型写法，不是中立类型——
`kind` 那一格写的是 **`number`** ✗，不是 `int` ✓（第一版写成 `int`，
编译期报「Cannot find name 'int'」✓，位置正好在这一行 ✓——**这条规矩只有踩过才记得住** ✓）。

# const ErrorKindGeneric:int = 0

**一次普通的失败**（第 139 轮）——默认那一档 ✓。

# const ErrorKindType:int = 1

**一次「类型」失败**（第 139 轮）：`null.y` ✓、`undefined[0]` ✓、`x` 不是函数却调用它 ✓——
JS 那边这一类全是 **`TypeError`** ✓，而**「叫这个名字」是语言层的事** ✗。

**引擎只报「这是哪一类失败」** ✓（这是引擎-level 的事实 ✓：它知道自己在做类型检查 ✓），
**语言层把它翻成名字** ✓（`TypeError` / `Error` ✓）——与 `PrototypeKey`（名字由语言层给 ✓）、
`SetErrorFactory`（错误长什么样由语言层定 ✓）是**同一条分界** ✓。

**为什么不能直接传名字** ✗：引擎一旦认识 `"TypeError"` 这几个字母 ✓，
换一门语言（Python 的 `TypeError` 也是这个名字，但 Dart 不是 ✓）就得改引擎 ✓——
而这一层存在的全部意义就是「引擎不认识语言」✓。

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

## field PrototypeKey:int = 0

**构造函数把原型挂在哪个属性名下**（一格字符串句柄，由语言层给；`0` = 没设）。

**引擎不知道那是哪个字符串**：它只把这格句柄当键去查属性（`DoNew`）。
给 `0` 时 `new` 一律用 `Protos.Object`——**没接上时不说谎，只是不特殊**。

## field ConstructorProtos:Array<int> = []

**内建构造函数 → 原型对象**那张登记表（第 137 轮），**扁平的成对数组** ✓
（`[号, 句柄, 号, 句柄, …]` ✓）。

**为什么内建构造函数需要它** ✗：它们是 `HostRef` 值 ✓，**没有属性表** ✗——
所以 `GetProperty(它, "prototype")` 永远给 `undefined` ✗，
`instanceof` 于是抛「the right side of instanceof has no prototype object」✓。
**实测这一句是整族红的** ✓：`[] instanceof Array` ✓、`new Map() instanceof Map` ✓、
`new Error("x") instanceof Error` ✓ **全都**是它 ✓——**没有一个内建构造函数**能当 `instanceof` 的右边 ✗。

**为什么不让引擎认识那几个号** ✗：那是语言层的东西 ✓（`ErrorCtor` = 280 ✓ 是建库层的约定 ✓）。
引擎只提供**一格**（号 → 原型句柄 ✓），往里写什么由语言层决定 ✓——
与 `SetErrorFactory`（第 127 轮 ✓）、`PrototypeKey`（名字由语言层给 ✓）是同一套做法 ✓。

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

## field MakeError:ErrorFactory | null = null

**把「宿主异常的文字」变成「脚本要接住的值」的工厂**（第 127 轮补）——见 `Guard` 那一段 ✓。

**为什么引擎不自己造** ✗：脚本要接住的是一个**值** ✓（`Error` 对象，带 `message` ✓），
而「`Error` 长什么样」是**语言层**的事 ✓（`globals.xl.md` 的 `NewError` ✓）——
引擎不认识它 ✓。所以它只是一个**回调** ✓（不是堆里的值，**不用进根集** ✓）。

**`null` = 没装** ✓：没装就照旧把异常冒出去 ✓（纯脚本的机器、以及「引擎 bug」那条路 ✓）。

## field RaiseRequest:Value | null = null

**「请把这次宿主调用当成一次脚本站内异常」的请求**（第 121 轮补）。

**为什么需要它**：宿主函数（内建方法、客户能力）失败时**手上有的是宿主异常**
（TS 的 `Error`、C++ 的 `std::runtime_error`），而脚本要有的是**一个能被 `try` 接住的值**
（`Error` 对象）。宿主异常**没有**这条通道：它从调用点直接冒出 `Run()` ✗——
于是 `try { JSON.parse(bad) } catch {}` 这种写法在脚本里**接不住**，
整份程序以「语言层错误」收场 ✗。**这一格就是那条通道**：宿主构造好脚本要的那个值、
放进这一格，引擎在**宿主调用返回之后**把它当成一次 `throw` 走展开 ✓。

**它必须是根**：放进来的是堆对象（`Error` 对象），而从「放进来」到「被取走」之间
**可能发生分配**（宿主返回前还可能干别的活）✓。

**消费点是宿主调用的两处**（`DoCallValue` 的宿主分支与 `rt_call` 的 `host_call`）：
两处都在调用返回之后**立刻**看这一格 ✓，取走并清空 ✓——**只在那一瞬有效**，
不是「一直排队」（那样第二次调用会莫名其妙地抛上一次的错 ✗）。

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
this.RaiseRequest = null;
this.MakeError = null;
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
this.RaiseRequest = null;
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
if (this.RaiseRequest !== null && this.RaiseRequest.IsRef()) this.Roots.AddValue(this.RaiseRequest);
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
  // **真假走 `TruthyOf`，不走 `Value.AsBool`** ✗（第 144 轮）：`if` / `while` /
  // `&&` / `||` / `?:` 的五条降级**全落在这一条指令上** ✓，而 `AsBool` 把 `""` 判成**真** ✗
  //（它看不到码元长度 ✓）。改一处、五条构造一起对 ✓——这正是「口径只有一份」的好处 ✓。
  if (!TruthyOf(this.Table, frame.Slots[instr.A])) frame.Pc = instr.B;
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
  // **`D` 操作数：`this` 从哪来**。`-1`（也是历史行为）给 `undefined`；
  // `>= 0` 就从那一格取——`super(...)` 要的就是「用当前帧的 `this` 调父类构造函数」。
  // 这条扩展**向后兼容**：老代码的 `D` 全是 `-1`，行为一个字没变。
  const self = instr.D >= 0 ? frame.Slots[instr.D] : Value.Undefined();
  this.DoCallValue(frame, frame.Slots[instr.A], instr.B, instr.C, instr.B, self, 0);
  return;
}
if (instr.Op === Op.CallArray) {
  this.DoCallArray(frame, instr);
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

## method DoCallValue:(frame:HeapFrame, callee:Value, argBase:int, argc:int, returnSlot:int, thisValue:Value, constructTarget:int, argArray:int = -1)=>void

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
// **参数从哪来**（第 133 轮）：普通调用是「从 `argBase` 开始的 `argc` 格」✓；
// `call_array` 是「`argArray` 那一格里装着一个数组」✓。两处取参数（宿主分支与开帧分支）
// 都要能走这两条路 ✓——所以「有几个」与「第 i 个是谁」各收成一个方法 ✓，
// 而不是在两处各写一遍三元表达式 ✗（那正是**两处会走偏**的形状 ✗）。
const count = this.CallArgCount(frame, argBase, argc, argArray);
// **可调用值的两种**（第 145 轮）：宿主引用 ✓，以及**带可调用载荷的对象** ✓
//（`String(1)` 里的 `String` 是**对象**——它还要能挂静态属性 ✓，见 `heap.xl.md`
// 的 `AttachCallable` 那一段 ✓）。两者走的是**同一条**宿主通道 ✓——
// 判据收在 `IsHostCallable` 一处 ✓，取参数与展开也各只有一份 ✓。
if (this.IsHostCallable(callee)) {
  const args: Value[] = [];
  for (let i = 0; i < count; i++) {
    args.push(this.CallArgAt(frame, argBase, argArray, i));
  }
  const produced = this.CallHostValue(callee, thisValue, args);
  // **`null` 表示展开已经发生** ✓（宿主请求了一次脚本站内异常 ✓）：**连结果都不许写** ✗——
  // 写下去会盖掉处理点正要用的那一格 ✓（原来那版在这里 `return`，正是为了这一条 ✓）。
  if (produced === null) return;
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
  // **「调的不是函数」要能被脚本接住**（第 153 轮）✓，而且**只改这一处** ✗：
  // 原来抛的是**引擎的**异常 ✓，它会冒出 `Run()` ✓——于是
  // `try { o.m() } catch {}` 进不去 `catch` ✗（JS 是 `TypeError` ✓，**可接住** ✓）。
  // 走 `Guard` 那条路 ✓，与第 127 / 136 轮的「属性读空值」是**同一条**处置 ✓。
  //
  // **不能改成「把整条调用包进 Guard」** ✗（第一版就是这么写的 ✓，判据当场红了三条 ✗）：
  // 那样连**构造函数 / 宿主函数**里抛的错也一起变成脚本异常 ✓——
  // 而「引擎内部的失败照样冒出」是**故意**的 ✓（第 121 轮那条兜底判据钉着它 ✓）。
  // 所以包的是**这一句诊断** ✓，不是那一段调用 ✓。
  //
  // **第 153 轮第二次试的结果** ✗：这一处（`Op.Call` 那条路）**改回来了** ✓——
  // 它一改，`new` 那一族的判据当场红了 ✓（「没接上原型名字时要报出来」✓）。
  // 那一档的重点是**引擎内部的失败照样冒出** ✓（第 121 轮那条兜底判据钉着它 ✓），
  // 而这一条诊断恰好也在那条路上 ✓。**所以只改下面那条 `Op.CallMethod`** ✓——
  // 判据钉的那几处都不是方法调用 ✓，而 `o.m?.()` 那一族正是 ✓。
  throw new Error("unimplemented: calling a non-closure value");
}
const closure = this.Table.Get(callee.Ref).AsClosure();
const info = FunctionAtEntry(this.Code(), closure.Code);
if (info === null) {
  throw new Error("closure points at no function: " + closure.Code);
}
// **生成器函数不在这里跑**：调用它只造一个生成器对象（帧开好但不上栈）。
if (info.IsGenerator) {
  // **剩余参数要在开帧时收掉**（第 133 轮）：多出来的那些实参**在自己的帧里没有格子** ✗
  //（`SlotCount` 定死 ✓、调用方传几个编译期不知道 ✓），所以**开帧的人顺手收** ✓。
  const restCount = this.RestCountOf(info, count);
  if (!this.NeedRoom(ObjectCharge * 2 + info.SlotCount * ValueCharge
      + (restCount > 0 ? ObjectCharge + ValueCharge * restCount : 0))) return;
  const createdHandle = this.Table.CreateFrame(closure.Code, info.SlotCount, 0, -1);
  const created = this.Table.Get(createdHandle).AsFrame();
  created.Pc = closure.Code;
  created.Env = closure.Env;
  created.This = thisValue;
  this.FillParameters(created, info, frame, argBase, argArray, count);
  const generatorHandle = this.Table.CreateGenerator(createdHandle);
  created.Generator = generatorHandle;
  if (returnSlot >= 0) frame.Slots[returnSlot] = Value.FromObject(generatorHandle);
  return;
}
const restCount = this.RestCountOf(info, count);
if (!this.NeedRoom(ObjectCharge + info.SlotCount * ValueCharge
    + (restCount > 0 ? ObjectCharge + ValueCharge * restCount : 0))) return;
const handle = this.Frames.Push(closure.Code, info.SlotCount, returnSlot);
const created = this.Table.Get(handle).AsFrame();
created.Env = closure.Env;
created.This = thisValue;
created.ConstructTarget = constructTarget;
this.FillParameters(created, info, frame, argBase, argArray, count);
```

## method IsHostCallable:(value:Value)=>bool

**这个值能不能被调用**——`HostRef` 与**带可调用载荷的对象**都算（第 145 轮）。

**为什么收成一个方法**：这个判据在**三处**要用 ✓（`DoCallValue` 的调用路 ✓、
`DoNew` 的构造路 ✓、`CallNative` 的重入路 ✓——`[1, 2].map(String)` 走的就是第三条 ✓）。
写三遍就是三处会走偏 ✗——而走偏的症状是「有一处能调、另一处报 `calling a non-closure value`」✓
（那种消息听起来像脚本写错了 ✗）。

**对象那一半要看堆**：`Tag` 是 `Object` 的还有帧 / 环境 / 生成器 / 迭代游标那些
**引擎内部对象** ✓，它们没有载荷 ✓（`Host` 是 `null` ✓）——所以这一条判据必须
**真的去读那一格** ✗，不能只看标签 ✓。

```ts
if (value.Tag === ValueTag.HostRef) return true;
if (value.Tag === ValueTag.Object) return this.Table.Get(value.Ref).Host !== null;
return false;
```

## method CallHostValue:(callee:Value, thisValue:Value, args:Array<Value>)=>Value | null

**调一次宿主可调用值**（第 145 轮从 `DoCallValue` 里抽出来 ✓）——宿主函数与
可调用对象**共用这一份** ✓（`DoCallValue` 的调用路、`CallNative` 的重入路 ✓）。

**返回 `null` 的意思是「展开已经发生」** ✓：宿主请求了一次脚本站内异常 ✓
（`RaiseRequest` / `Raise` 那一段 ✓）——`DoThrow` 已经把控制流交给处理点了 ✓，
所以调用方**必须立刻返回** ✗，连结果都不许往槽里写 ✓（那一格可能是处理点要用的 ✓）。
**这条「要不要写结果」原来靠调用方自己 `return`** ✓；抽出来之后它变成**返回值的一半语义** ✓，
所以类型写成 `Value | null` ✓——让「可能没有结果」这件事在签名上就看得见 ✓。

```ts
const invoker = this.Host;
if (invoker === null) throw new Error("calling a host function with no host installed");
const produced = invoker(callee, thisValue, args, this.Room());
// **取走是必须的**：留着它，下一次宿主调用会莫名其妙地抛上一次的错。
const raised = this.TakeRaise();
if (raised !== null) {
  this.DoThrow(raised);
  return null;
}
return produced;
```

## method CallArgCount:(frame:HeapFrame, argBase:int, argc:int, argArray:int)=>int

**这一次调用实际有几个实参**（第 133 轮）。

- `argArray < 0`：普通调用，就是 `argc` ✓（调用方写死的那个数 ✓）；
- 否则：**那一格里的数组有多长就是几个** ✓。

**不是数组就抛** ✓：`call_array` 的 `B` 由降级层填 ✓，填错就是**降级层的 bug** ✗——
而**验证层查不出这一条** ✗（动态 IL 证明不了类型 ✓），所以在这里响亮地报 ✓。

```ts
if (argArray < 0) return argc;
const items = frame.Slots[argArray];
if (items.Tag !== ValueTag.Array) {
  throw new Error("call_array needs an array of arguments");
}
return this.Table.Get(items.Ref).AsArray().GetLength();
```

## method CallArgAt:(frame:HeapFrame, argBase:int, argArray:int, index:int)=>Value

**第 `index` 个实参**（`CallArgCount` 的配套 ✓）。两个取参数的地方共用它 ✓。

```ts
if (argArray < 0) return frame.Slots[argBase + index];
return this.Table.Get(frame.Slots[argArray].Ref).AsArray().GetAt(index);
```

## method FillParameters:(created:HeapFrame, info:FunctionInfo, frame:HeapFrame, argBase:int, argArray:int, count:int)=>void

**把实参铺进新帧**（第 133 轮从 `DoCallValue` 里抽出来 ✓）——普通与生成器两条路共用 ✓。

**两处规矩**：

1. **拷多少要夹住** ✗（这一轮顺带修的）：`SlotCount` 是**被调方**定的 ✓，
   而调用方传几个它管不着 ✓。原来这里是 `for (i < argc) created.Slots[i] = …` ✗——
   `argc` 比 `SlotCount` 大时**写到帧尾之外** ✗：TS 那边 `Array` 会**悄悄变长** ✓，
   C++ 那边就是越界写 ✗（**同一个 IR 在两个目标上是两种命运** ✗）。
   夹到 `SlotCount` 之后，多出来的实参**看不见** ✓——而 **JS 本来也看不见它们** ✓
   （除了 `arguments` 与剩余参数，两条都在别处 ✓）。
2. **剩余参数收在最后一格** ✓：`[fixed, count)` 那些实参造一个数组，
   放进第 `fixed` 格 ✓（`fixed = ParamCount - 1` ✓）。**数组要带数组原型** ✓
   （否则它连 `.join` 都没有 ✗——与 `Object.keys` 那条是同一条规矩 ✓）。

**为什么 `RestCountOf` 与这里都要算一遍**：`NeedRoom` 必须在**开帧之前**问 ✓
（`README` 的硬性约定：不许「先开帧再问」✓），所以调用方先算一次 ✓；
这里再算一次是因为**铺参数要那个数** ✓。两处用的是**同一个函数** ✓，不会走偏 ✓。

```ts
const fixed = info.HasRest ? info.ParamCount - 1 : info.ParamCount;
// **拷的个数要按「实际传了几个」夹**（`count`），**不是按 `SlotCount`** ✗——
// 这一格是**这一轮实测踩出来的** ✓：写成 `min(fixed, SlotCount)` 时，
// `function f(a = 1, b = a + 10)` 的 `f(2)` 会把**调用方第 1 格之后的垃圾**抄进 `b` ✗
//（症状：`b` 不再是 `undefined` ✓，默认值判定成「传了」✗，`f(2)` 给 200 而不是 212 ✓）。
// 原来那句 `for (i < argc)` 恰好是对的 ✓——把它改成「扫满形参」是**往错的方向走** ✗，
// 而**旧判据当场就把这一格点出来了** ✓（第 119 轮那条默认参数判据 ✓）。
const limit = count < fixed ? count : fixed;
// 没有剩余参数时，**多传的**那些也要拷（它们落在形参之后的格上 ✓），但同样不能越过 `count` ✓，
// 也不能越过帧尾 ✓（`SlotCount` 是被调方定的 ✓）。
const total = count < info.SlotCount ? count : info.SlotCount;
for (let i = 0; i < limit; i++) {
  created.Slots[i] = this.CallArgAt(frame, argBase, argArray, i);
}
if (!info.HasRest) {
  for (let i = fixed; i < total; i++) {
    created.Slots[i] = this.CallArgAt(frame, argBase, argArray, i);
  }
  return;
}
const restCount = this.RestCountOf(info, count);
const restHandle = this.Table.CreateArray();
if (this.Protos !== null) this.Table.Get(restHandle).Proto = this.Protos.Array;
for (let i = 0; i < restCount; i++) {
  // **每一趟现取视图** ✓（`heap.xl.md` 那条：句柄稳定、视图不稳定 ✓）。
  this.Table.Get(restHandle).AsArray().Push(this.CallArgAt(frame, argBase, argArray, fixed + i));
}
if (fixed < info.SlotCount) created.Slots[fixed] = Value.FromArray(restHandle);
```

## method DoCallArray:(frame:HeapFrame, instr:Instruction)=>void

**`call_array` 的执行**（第 133 轮）：`A` 被调方、`B` 装着实参的数组、`C` 结果格、
`D` 的 `this`（`-1` 给 `undefined` ✓）。

**它就是 `call` 加一个「参数从数组来」** ✓——三条分支（宿主 / 生成器 / 闭包）
**一个字都没有另写** ✓：全部落在 `DoCallValue` 里 ✓，这里的 `argArray` 只是换了个来源 ✓。

**为什么结果写在 `C` 上、不在「参数基址」上** ✗：这里**没有参数基址**这回事 ✓
（参数在堆里那个数组上 ✓）。所以调用约定那一条（结果落回基址）在这条路上**不适用** ✓，
写清楚免得后人以为是漏了 ✓。

```ts
const self = instr.D >= 0 ? frame.Slots[instr.D] : Value.Undefined();
this.DoCallValue(frame, frame.Slots[instr.A], 0, 0, instr.C, self, 0, instr.B);
```

## method RestCountOf:(info:FunctionInfo, count:int)=>int

**剩余参数要收几个**（第 133 轮）。

**两处用它**（`NeedRoom` 那一问与 `FillParameters` 那一铺 ✓）——**同一个数只算一处** ✓。

```ts
if (!info.HasRest) return 0;
const fixed = info.ParamCount - 1;
if (fixed < 0) return 0;
if (count <= fixed) return 0;
return count - fixed;
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
// **这一次宿主调用到此结束**：产出就是那个生成器对象。
// 曾经不标它，宿主把这次调用判成「在等承诺」（`Parked`）——因为「没帧了、又没结束」
// 在宿主眼里就是挂起。**与 `DoIterNext` 入口处那次重置是一对**：那边负责让
// 「推进生成器」不被上一次的结束状态挡住，这边负责让「造生成器」这次调用有明确结局。
this.Finished = true;
this.Status = VmStatus.Halted;
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

**实例的原型从哪来**：读构造函数上**那个由语言层指定的属性**（`PrototypeKey`）——
它是对象就用它当原型；不是（或者没设过那个名字）就用 `Protos.Object`。

**为什么这个名字由外面给**：`"prototype"` 是 JS 语义的字符串，**引擎不该认识它**
（换一门语言，那个名字就换一个）。引擎只拿着一格**字符串句柄**，那格字符串是哪儿来的、
写的什么字，它不关心。这与 `Protos` 是同一套做法：**结构由引擎提供，名字由语言层给**。

```ts
if (this.Program === null) throw new Error("no program loaded");
const protos = this.Protos;
if (protos === null) throw new Error("no prototype table");
const callee = frame.Slots[instr.A];
// **宿主那一档**（`new Map()` / `new Date(ms)` 这一类：那个全局名是一个宿主引用，
// 或者是一个**带可调用载荷的对象** ✓——第 145 轮把后者接了进来 ✓）：
// **不造实例、不看原型**——让宿主自己把对象造好并返回，这正是 JS 的
// 「构造函数返回了对象就用它」。造实例再让宿主往里填也行，但那样引擎就得先猜
// 「宿主想要哪种对象」；**把这件事留给知道它的那一层**。
//
// **两条候选修法**（第 138 轮记在这里的 ✓）：
//   ① 让宿主引用带一张静态属性表 ✗（回收器要多跟一条边，见 `heap.xl.md` 的 `AttachCallable`）；
//   ② **让「对象上的可调用载荷」算数** ✓——第 145 轮选的这条 ✓。
// 选②之后 `Date` 不必再靠降级层那条特例 ✓（`new Date(ms)` 与 `Date.now()` 同时成立 ✓），
// 这一支也不再需要那句「说清原因」的抛 ✗。
if (this.IsHostCallable(callee)) {
  this.DoCallValue(frame, callee, instr.B, instr.C, instr.B, Value.Undefined(), 0);
  return;
}
// **普通对象当构造函数：给一句说清原因的话** ✓（不是「calling a non-closure value」✗——
// 那种消息会让人以为是**调用**写错了 ✓）。第 145 轮之后这一支的含义变窄了 ✓：
// 「对象 + 可调用载荷」那一档**已经能当构造函数** ✓（上面那条 ✓），
// 走到这里的对象**没有那一格** ✓（所以它是「拿一个数据对象去 `new`」✓）。
if (callee.Tag === ValueTag.Object) {
  throw new Error("unimplemented: calling an object as a constructor (this object is not callable)");
}
const created = this.Guard(() => this.CreateInstance(callee));
if (!created.IsRef()) return;
this.DoCallValue(frame, callee, instr.B, instr.C, instr.B, created, created.Ref);
```

## method CreateInstance:(callee:Value)=>Value

造一个实例：**原型取自构造函数上那个属性**（见 `DoNew`）。

**整段都在调用方的 `Guard` 里**：查属性可能触发访问器（会分配），造对象也要分配——
分配必须在安全点上做，而 `Guard` 就是「凑齐根快照之后再动手」的那道门。

```ts
const protos = this.Protos;
if (protos === null) throw new Error("no prototype table");
let proto = protos.Object;
if (this.PrototypeKey > 0 && callee.IsObject()) {
  const key = Value.FromString(this.PrototypeKey);
  const found = GetProperty(this.Room(), this.Native(), protos, this.Table, callee, key);
  if (found.IsObject()) proto = found.Ref;
}
if (!this.NeedRoom(ObjectCharge + ValueCharge)) throw new Error("out of room");
const handle = this.Table.CreateObject();
this.Table.Get(handle).Proto = proto;
return Value.FromObject(handle);
```

## method SetPrototypeKey:(handle:int)=>void

语言层告诉这台机器：**构造函数的原型挂在哪个属性名下**（给的是字符串句柄）。

给 `0` 就回到「一律用 `Protos.Object`」的老行为——**没接上时不说谎，只是不特殊**。

```ts
this.PrototypeKey = handle;
```

## method Raise:(value:Value)=>void

**宿主请求一次脚本站内异常**（第 121 轮补；见 `RaiseRequest` 那一段）。

**它不在调用点上抛**：宿主只是**留下**这个值，真正的展开发生在宿主调用**返回之后**
（那两处检查）✓——因为「抛」这件事必须由**当时正握着帧栈**的那一层做 ✗
（宿主函数没有自己的帧，它手上只有一个 `room`）。

**传进来的必须是脚本要接住的那个值**（`Error` 对象、字符串、随便什么 ✓）——
「宿主异常的文字」怎么变成「脚本的值」是**语言层**的事 ✗，引擎不认识 `Error` 长什么样 ✓。

```ts
this.RaiseRequest = value;
```

## method TakeRaise:()=>Value | null

**取走那次请求**（取走即清空）——没有请求给 `null`。

**为什么必须取走**：留着它，**下一次**宿主调用会莫名其妙地抛上一次的错 ✗
（`RaiseRequest` 那一格是「只在那一瞬有效」的 ✓）。

```ts
const value = this.RaiseRequest;
this.RaiseRequest = null;
return value;
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
// **七条位运算**（第 147 轮）：`& | ^ << >>` 与 `~` 的结果都落在 `int32` 里 ✓，
// 只有 `>>>` 可能超出 ✗（`-1 >>> 0` 是 `4294967295` ✓）——那一条自己走 `MakeNumber` ✓。
// **`& | ^` 与逻辑那两条同名而不同物** ✗：`&&` / `||` 在降级层落成**控制流** ✓，
// 根本不到这一层来 ✓（`ir.xl.md` 的 `BitOr` 那条写着这一句 ✓）。
if (id === RtOp.BitAnd) {
  RequireArgc(argc, 2, "bit_and");
  return RtBitAnd(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.BitOr) {
  RequireArgc(argc, 2, "bit_or");
  return RtBitOr(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.BitXor) {
  RequireArgc(argc, 2, "bit_xor");
  return RtBitXor(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.BitNot) {
  RequireArgc(argc, 1, "bit_not");
  return RtBitNot(this.Table, slots[base]);
}
if (id === RtOp.Shl) {
  RequireArgc(argc, 2, "shl");
  return RtShl(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.Shr) {
  RequireArgc(argc, 2, "shr");
  return RtShr(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.UShr) {
  RequireArgc(argc, 2, "ushr");
  return RtUShr(this.Table, slots[base], slots[base + 1]);
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
  // **这里要包 `Guard`**（第 136 轮）：`GetProperty` 现在会为「读 `null` / `undefined`
  // 的属性」抛 ✓（JS 的 `TypeError` ✓），而那一抛**必须走错误工厂**才能被脚本的
  // `try` 接住 ✓——不包的话整份程序照样挂 ✗（与 `str + obj` 那条修法同源 ✓）。
  // **原型表要先落到一个局部常量上** ✗：`this.Protos` 是**可变的字段** ✓，
  // 所以上面那句 `=== null` 的收窄**进不了闭包** ✓（编译期报
  // 「`Protos | null` 不能当 `Protos`」✗，位置正好在这一行 ✓）。
  const propReceiver = slots[base];
  const propKey = slots[base + 1];
  // **内建构造函数身上的 `prototype`**（第 137 轮）：它们是 `HostRef` ✓、**没有属性表** ✗，
  // 所以 `class MyErr extends Error` 里读 `Error.prototype` 读到的是 `undefined` ✗，
  // 紧接着 `set_proto` 报「set_proto needs two objects」✓（现场离「`Error` 没有属性表」
  // 这个真相很远 ✗）。这一条把**登记表**那一格借出来 ✓——
  // 键**按内容比**（`RtCmpEqStrict` ✓）：`PrototypeKey` 那格字符串与源码里写的
  // `prototype` 是**两个堆对象** ✗（字符串不去重 ✓），比句柄永远不相等 ✓
  //（第一版就是比句柄，于是 `extends Error` 照样报同一句话 ✓）。
  if (propReceiver.Tag === ValueTag.HostRef && this.PrototypeKey > 0
    && propKey.Tag === ValueTag.String
    && RtCmpEqStrict(this.Table, propKey, Value.FromString(this.PrototypeKey)).AsBool()) {
    const builtinProtoValue = this.ConstructorProtoOf(this.Table.Get(propReceiver.Ref).Host!.CapabilityId);
    if (builtinProtoValue > 0) return Value.FromObject(builtinProtoValue);
  }
  const propProtos = this.Protos;
  // **读 `null` / `undefined` 的属性是「类型失败」** ✓（第 139 轮）：
  // JS 那边这一类全是 `TypeError` ✓——`kind` 那一格就是给它留的 ✓。
  return this.Guard(() => GetProperty(this.Room(), this.Native(), propProtos, this.Table, propReceiver, propKey),
    ErrorKindType);
}
if (id === RtOp.SetProp) {
  RequireArgc(argc, 3, "set_prop");
  return this.Guard(() => SetProperty(this.Room(), this.Native(), this.Table, slots[base], slots[base + 1], slots[base + 2]));
}
if (id === RtOp.SetProto) {
  RequireArgc(argc, 2, "set_proto");
  return RtSetProto(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.Instanceof) {
  RequireArgc(argc, 2, "instanceof");
  const protosForInstanceOf = this.Protos;
  if (protosForInstanceOf === null) throw new Error("no prototype table");
  const instanceRight = slots[base + 1];
  // **内建构造函数走登记表**（第 137 轮）✓：它们是 `HostRef` ✓，**没有属性表** ✗，
  // 所以下面那条「读 `prototype` 属性」的路永远读不到东西 ✗——
  // `[] instanceof Array` / `new Error() instanceof Error` 报的都是同一句 ✓。
  // 登记由语言层在建全局对象时做 ✓（`ConstructorProtos` 那一段写着为什么不让引擎认号 ✓）。
  if (instanceRight.Tag === ValueTag.HostRef) {
    const instanceId = this.Table.Get(instanceRight.Ref).Host!.CapabilityId;
    const builtinProto = this.ConstructorProtoOf(instanceId);
    if (builtinProto > 0) {
      return Value.FromBool(RtChainHas(this.Table, slots[base], builtinProto));
    }
  }
  return this.Guard(() => RtInstanceOf(this.Room(), this.Native(), protosForInstanceOf, this.Table,
    this.PrototypeKey, slots[base], instanceRight));
}
if (id === RtOp.DelProp) {
  RequireArgc(argc, 2, "del_prop");
  if (!slots[base].IsObject()) throw new Error("unimplemented: delete on a primitive receiver");
  return Value.FromBool(DeleteProperty(this.Table, slots[base].Ref, slots[base + 1]));
}
if (id === RtOp.GetIndex) {
  RequireArgc(argc, 2, "get_index");
  const indexReceiver = slots[base];
  // **对象的下标读**：JS 的 `o[k]` 就是把键**字符串化**再按属性查。
  // 数组那条路（真下标）先走；**不是数组就落到属性查找**——这一条以前直接抛，
  // 于是「对象的下标读」一直是一条记在台账里的缺口。
  //
  // **字符串接收者给「一个码元的字符串」**（第 136 轮补上）✓：
  // `"abc"[0]` 在 JS 里是 `"a"` ✓，而这里原来**一律给 `undefined`** ✗
  // （上面那条注释写着「这是一块已知的语义差，不在这里顺手猜一个」✗——
  //  改它的理由不是「顺手」✓，而是**下面 `props.xl.md` 的 `GetIndex` 早就办到了** ✓：
  //  它那一支写着「字符串给一个码元的字符串」✓，只是**这一层没走它** ✗。
  //  同一件事两处答案，删掉错的那一处 ✓）。
  //
  // **它顺带修掉两件事**（都不是猜的 ✓）：`const [a, b] = "xy"` ✓——数组模式的解构
  // **按下标读**（`Destructure` 那条路 ✓），而字符串一直是「读不出来」✗；
  // 以及 `for (const [a, b] of ["xy"])` ✓（第 136 轮加的字符串迭代 ✓，
  // 每一轮拿到的是**一个码元的字符串** ✓，再解构就落到这里 ✓）。
  // **`null[0]` / `undefined[0]` 也要抛**（第 136 轮）✓——与 `GetProperty` 那条同一个道理 ✓
  //（JS 里 `null[0]` 是 `TypeError` ✓，而这里原来落到下面那句 `return Value.Undefined()` ✗）。
  // **数字 / 布尔的下标读照旧给 `undefined`** ✓（JS 的 `(5)[0]` 就是 `undefined` ✓）——
  // 只有**空值**才抛 ✓。
  if (indexReceiver.Tag === ValueTag.Undefined || indexReceiver.Tag === ValueTag.Null) {
    const what = indexReceiver.Tag === ValueTag.Null ? "null" : "undefined";
    return this.Guard(() => {
      throw new Error("cannot read properties of " + what);
    }, ErrorKindType);
  }
  if (indexReceiver.Tag === ValueTag.String) {
    return GetIndex(this.Table, indexReceiver, slots[base + 1]);
  }
  if (indexReceiver.Tag !== ValueTag.Array) {
    if (!indexReceiver.IsObject()) return Value.Undefined();
    const indexProtoTable = this.Protos;
    if (indexProtoTable === null) throw new Error("no prototype table");
    // **符号键不许字符串化**：`o[sym]` 的键就是那个符号本身（属性查找按 `Id` 比，
    // 见 `props.xl.md` 的 `KeyMatches`）。把它 `ToString` 成 `"Symbol(x)"`，
    // 两次查找就会落到同一个字符串键上——**静默错值**。
    const rawKey = slots[base + 1];
    const indexKey = rawKey.Tag === ValueTag.Symbol
      ? rawKey
      : RtToString(this.Room(), this.Table, rawKey);
    return this.Guard(() => GetProperty(this.Room(), this.Native(), indexProtoTable, this.Table,
      indexReceiver, indexKey));
  }
  return GetIndex(this.Table, indexReceiver, slots[base + 1]);
}
if (id === RtOp.SetIndex) {
  RequireArgc(argc, 3, "set_index");
  const indexTarget = slots[base];
  if (indexTarget.Tag !== ValueTag.Array) {
    if (!indexTarget.IsObject()) {
      throw new Error("unimplemented: assigning an index on a primitive receiver");
    }
    const setProtoTable = this.Protos;
    if (setProtoTable === null) throw new Error("no prototype table");
    // 符号键不许字符串化（同上：`o[sym] = v` 的键就是那个符号）。
    const rawSetKey = slots[base + 1];
    const setKey = rawSetKey.Tag === ValueTag.Symbol
      ? rawSetKey
      : RtToString(this.Room(), this.Table, rawSetKey);
    return this.Guard(() => SetProperty(this.Room(), this.Native(), this.Table,
      indexTarget, setKey, slots[base + 2]));
  }
  return this.Guard(() => SetIndex(this.Room(), this.Table, indexTarget, slots[base + 1], slots[base + 2]));
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
  // **这一支的两处抛也要能被接住**（第 127 轮）：`for (const x of 42)` 走到这里 ✓——
  // 判据现场先修了 `iter_next` ✓ 才发现真正抛的是**这一支** ✗（两处都抛同样的话 ✓，
  // 只补一处等于没补 ✓）。所以整支包进 `Guard` ✓。
  return this.Guard(() => {
    // **字符串也是可迭代物**（第 136 轮）✓：`for (const c of "ab")` ✓。
    // **它必须排在那句 `IsObject` 之前** ✗：字符串**不是对象**（`ValueTag.String` ✓），
    // 排在后面就永远走不到 ✓——报的还是「iterating a non-object」✓。
    // 这一支与 `spread_into`（第 132 轮）**同一口径** ✓：`[...'ab']` 早就通了 ✓。
    if (target.Tag === ValueTag.String) {
      return Value.FromObject(this.Table.CreateIterator(target.Ref));
    }
    if (!target.IsObject()) throw new Error("unimplemented: iterating a non-object");
    const item = this.Table.Get(target.Ref);
    if (item.Generator !== null) return target;
    if (target.Tag === ValueTag.Array) {
      return Value.FromObject(this.Table.CreateIterator(target.Ref));
    }
    throw new Error("unimplemented: iter_new on this kind of object");
  });
}
if (id === RtOp.IterNext) {
  RequireArgc(argc, 2, "iter_next");
  // **也要走 `Guard`**（第 127 轮）：`DoIterNext` 对「不可迭代的东西」会抛 ✓
  // （`for (const x of 42)` ✓），而这一抛以前**冒出 `Run()`** ✗——
  // 与 rt 层其它失败一样，现在由错误工厂抬成**脚本接得住**的异常 ✓。
  return this.Guard(() => this.DoIterNext(slots[base], slots[base + 1]));
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
  const produced = invoker(target, Value.Undefined(), args, this.Room());
  // 与 `DoCallValue` 的宿主分支同一个检查（**两处都要**：能力调用走的是这一条）。
  const raised = this.TakeRaise();
  if (raised !== null) {
    this.DoThrow(raised);
    return Value.Undefined();
  }
  return produced;
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
  const inReceiver = slots[base + 1];
  if (!inReceiver.IsObject()) {
    throw new Error("unimplemented: 'in' needs an object on the right");
  }
  // **键先字符串化**（第 123 轮；与 `get_index` / `set_index` 同一套 ✓）：
  // JS 的 `in` 也走 ToPropertyKey ✓——少了这一步，`1 in arr` 会往上抛
  // 「property keys must be strings or symbols」✗（判据现场就是这么红的 ✓）。
  // **符号键原样**（身份 ✓，不许字符串化 ✗）。
  const rawInKey = slots[base];
  const inKey = rawInKey.Tag === ValueTag.Symbol
    ? rawInKey
    : RtToString(this.Room(), this.Table, rawInKey);
  // **数组的下标键按「格子」答** ✓：元素不在 `Props` 里 ✗，
  // 只看属性表会把 `1 in [10, 20]` 答成**假** ✗（JS 给真 ✓）——**静默给错值比抛更坏** ✗。
  // **洞不算** ✓（`1 in [1, , 3]` 在 JS 里是假 ✓）。
  if (inReceiver.Tag === ValueTag.Array) {
    // **`"length"` 是数组的结构属性** ✓（与 `GetProperty` 那一支同一条口径 ✓）——
    // 它不在 `Props` 里 ✗，不问这一句就会把 `'length' in arr` 答成**假** ✗（JS 给真 ✓）。
    if (IsLengthKey(this.Table, inKey)) return Value.FromBool(true);
    const at = ArrayIndexAt(this.Table, inKey);
    if (at >= 0) {
      const array = this.Table.Get(inReceiver.Ref).AsArray();
      return Value.FromBool(at < array.GetLength() && !array.IsHole(at));
    }
  }
  return Value.FromBool(HasProperty(this.Table, inReceiver.Ref, inKey));
}
throw new Error("unimplemented: rt op " + RtOpName(id));
```

## method Native:()=>NativeCall

把这台机器包成语义层要的那个回调（`props.xl.md` 的 `NativeCall`）。

**这是第二处适配**（第一处是 `Room`）：rt / props 不该认识 `Vm`，而 `Vm` 认识它们。

```ts
return (callee: Value, thisValue: Value, args: Value[]) =>
  this.CallNative(callee, thisValue, args);
```

## method CallNative:(callee:Value, thisValue:Value, args:Array<Value>)=>Value

**重入分派循环**调一个脚本函数，拿它的返回值。访问器（getter / setter）与内建方法
（`Array.prototype.map` 那种）只有这一条路。

三件事值得记住：

1. **深度上限**（`MaxNativeDepth`）：脚本可以在 getter 里再读同一个属性；没有上限就是
   栈溢出的另一种写法；
2. **结果走 `NativeReturnSlot`**：重入时没有「调用者的槽」，所以结果进 `NativeResult`；
3. **回来时状态可能已经被改**（脚本抛了、预算用尽）：那种情况下返回 `undefined`——
   **它的调用方（rt 算子）的结果会被丢掉，因为控制流已经不在那条指令上了**
   （展开把 `Pc` 改成了处理点）。这条推理让「重入期间出事」不需要额外清理。

**可调用对象走同一条**（第 145 轮）✓：`[1, 2].map(String)` 的 `String` 是**对象** ✓，
所以这一支不压帧、也没有生成器那回事 ✓——直接交给 `CallHostValue` ✓
（与 `DoCallValue` 那份**同一处** ✓）。

```ts
// **可调用对象也要能当回调** ✓（第 145 轮）：`[1, 2].map(String)` 里那个 `String`
// 是一个**对象** ✓——建库层现在把这种值交进来了 ✓（`IsCallableValue` ✓），
// 所以这一层要接得住 ✗。三条路（调用 / 构造 / 重入）走的是**同一个** `CallHostValue` ✓。
if (this.IsHostCallable(callee)) {
  const produced = this.CallHostValue(callee, thisValue, args);
  if (produced === null) return Value.Undefined();
  return produced;
}
if (callee.Tag !== ValueTag.Closure) {
  // **「调的不是函数」今天还不能被脚本接住** ✗（第 153 轮量准、**没做** ✓）：
  // 这一抛是**引擎的**异常 ✓，会冒出 `Run()` ✓——于是
  // `try { o.m() } catch {}` 进不去 `catch` ✗（JS 是 `TypeError` ✓，**可接住** ✓）。
  //
  // **两条路都试过、都退回来了** ✗，把结论留在这里 ✓：
  //   ① 「把整条调用包进 `Guard`」✓——判据当场红了**三条** ✗：那样连
  //      **构造函数 / 宿主函数**里抛的错也变成脚本异常 ✓，而「引擎内部的失败照样冒出」
  //      是**故意**的 ✓（第 121 轮那条兜底判据钉着它 ✓）；
  //   ② 「只包 `Op.CallMethod` 那一条」✓——**完全不动** ✗：`o.m?.()` 与 `o?.n?.()`
  //      降级出来的是 `Op.Call`（第 152 轮改成「先取方法值、再带 `this` 调」✓），
  //      而 `new` 那一族也在 `Op.Call` 上 ✓——两处**共用的正是同一条** ✗。
  // **所以这件事的真问题是「失败要有类别」** ✗（台账里那一条 ✓）：
  // 得让这一抛带上「是 `TypeError`」✓，由错误工厂按类别抬成脚本异常 ✓——
  // 那样「引擎内部的失败照样冒出」与「脚本接得住 `TypeError`」两件事才分得开 ✓。
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
// **按实参表铺**（第 142 轮）✓：铺到帧的格数为止 ✓——多出来的丢掉 ✓
//（JS 也这样 ✓：多传的实参没有名字接 ✓，只是 `arguments` 看得见 ✓，而本仓没有它 ✓）。
for (let i = 0; i < args.length && i < info.SlotCount; i++) {
  frame.Slots[i] = args[i];
}
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
  // **字符串的游标**（第 136 轮）：一次给一个**码元** ✓。
  //
  // **按码元拆，不按码点** ✓——与 `.length` / 下标 / `charAt` / `spread_into`
  // **同一条口径** ✓（代理对算两个 ✓）。JS 那边字符串迭代是**按码点**的 ✗
  //（`for (const c of "😀")` 只给一个 ✓，而 `"😀".length` 是 2 ✓）。
  // **为什么不照 JS 办** ✗：整层的口径是码元 ✓——单独让迭代按码点，会让
  // 「`[...s]` 与 `for (const c of s)` 给的不一样」✗（同一种东西两种答案，比一起偏更糟 ✓）。
  // 这是一处**已知差** ✓，记在台账里 ✓。
  if (source.Tag === ValueTag.String) {
    // **`TextUnitsOf` 收的是 `Value`** ✓，而 `Get` 给的是**载荷** ✗——
    // 所以要现包一个值出来 ✓（第一版直接递载荷，编译期就报
    // 「`HeapObject` 不能当 `Value`」✗，位置正好在这一行 ✓）。
    const units = TextUnitsOf(this.Table, Value.FromString(cursor.Source));
    const at = cursor.Index;
    if (at >= units.length) return this.MakeIterResult(Value.Undefined(), true);
    cursor.Index = at + 1;
    const unit = units[at];
    // **造字符串要先问房间** ✓（与 `spread_into` 那条一字不差 ✓）——
    // 这一支也可能从**宿主**那条路进来（`it.next()` ✓），所以自己包一层 `Guard` ✓
    //（`MakeIterResult` 也是这么办的 ✓）。
    return this.Guard(() => {
      if (!this.NeedRoom(ObjectCharge + CodeUnitCharge + ValueCharge)) {
        throw new Error("out of room");
      }
      return this.MakeIterResult(Value.FromString(this.Table.CreateString([unit])), false);
    });
  }
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
// **不能按「状态是不是 Ready」判成败**：挂起会把栈清空，而运行循环的口径是
// 「没有帧了 = 停了」——那是**调用结束**的意思，可这里明明是**挂起**。
// 所以结局按**生成器自己的状态**判（Suspended 与 Done 都是正常结果）；
// 真出了事（抛了 / 越限）就**响亮地报出来**，而不是让调用方拿到一个 `undefined`
// 却以为「生成器产出的就是 undefined」。
if (this.Status !== VmStatus.Ready && this.Status !== VmStatus.Halted) {
  throw new Error("the generator neither suspended nor finished (status " + this.Status + ")");
}
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

## method SetErrorFactory:(make:ErrorFactory)=>void

**装上「宿主异常的文字 → 脚本要接住的值」这个工厂**（第 127 轮）——见 `Guard` 那一段 ✓。

**谁装** ✓：**知道两边的那一层**（驱动 / 宿主 ✓）——`tsrun` 装的是
`(text) => NewError(room, table, protos, text)` ✓（与 `RaiseFromHost` 用的是**同一个**构造 ✓，
所以「宿主函数失败」与「rt 层失败」在脚本看来是**同一种东西** ✓）。

```ts
this.MakeError = make;
```

## method HostText:(error:any)=>string

**宿主异常 → 一句话** ✓（引擎侧那一份最小的：只认 `message` ✓）。

**为什么引擎里会出现 `error.message`** ✗：这一层本来就贴着宿主跑 ✓
（`Guard` 里那句 `error.message === "out of room"` 早就是这个形状 ✓）——
引擎不认识的只是「**脚本**要接住什么」✓，而那是工厂决定的 ✓。

```ts
if (error !== null && error !== undefined && typeof error === "object" && "message" in error) {
  return String((error as any).message);
}
return String(error);
```

## method RegisterConstructorProto:(id:int, handle:int)=>void

**登记一个内建构造函数的原型**（第 137 轮）——语言层在建全局对象时调它 ✓
（`ConstructorProtos` 那一段写着为什么 ✗）。

**同一个号登记两次就以最后一次为准** ✓（后写覆盖先写 ✓）：那样重跑一遍
`BuildGlobals` 不会把表越拉越长 ✓。

```ts
for (let i = 0; i < this.ConstructorProtos.length; i = i + 2) {
  if (this.ConstructorProtos[i] !== id) continue;
  this.ConstructorProtos[i + 1] = handle;
  return;
}
this.ConstructorProtos.push(id);
this.ConstructorProtos.push(handle);
```

## method ConstructorProtoOf:(id:int)=>int

这个号登记过原型没有；没登记给 `0` ✓（调用方据此退回「读 `prototype` 属性」那条路 ✓）。

```ts
for (let i = 0; i < this.ConstructorProtos.length; i = i + 2) {
  if (this.ConstructorProtos[i] === id) return this.ConstructorProtos[i + 1];
}
return 0;
```

## method Guard:(body:ValueThunk, kind:int = ErrorKindGeneric)=>Value

把 rt 层的异常分成三类：**资源上限** → 机器的状态 ✓、**装了错误工厂的其它异常** →
**脚本站内异常** ✓（第 127 轮）、**其余** → 照旧冒出去 ✓（引擎 bug 要响 ✓）。

**`kind` 是「这是哪一类失败」** ✓（第 139 轮 ✓）——默认 `ErrorKindGeneric` ✓，
**类型失败**的调用点传 `ErrorKindType` ✓（`null.y` ✓、`undefined[0]` ✓、调一个不是函数的值 ✓）。
**引擎不认识 `"TypeError"` 这几个字母** ✗（见 `ErrorKindType` 那一段 ✓）。

**为什么「其余」也要分** ✗：第 125 轮那条边界——`a + b` 两边都是变量、
运行期一边是对象时，引擎的 `RtAdd` 会抛 ✓；而那一抛**从 `Run()` 直接冒出来** ✗，
脚本的 `try { … } catch { … }` **接不住** ✗（宿主函数那条路第 121 轮就通了 ✓，
这一条是 **rt 层**的 ✓）。于是 `str + obj` 只能是「整份程序挂掉」✗——那不像 JS ✓。

**为什么需要「错误工厂」而不是引擎自己造一个** ✗：脚本要接住的是一个**值** ✓
（`Error` 对象、带上 `message` ✓），而「`Error` 长什么样」是语言层的事 ✓
（`text.xl.md` / `globals.xl.md` 的 `NewError` ✓）——引擎不认识它 ✓。
所以驱动装一个工厂（`SetErrorFactory` ✓），引擎只把**话**交过去 ✓。

**没装工厂就照旧冒** ✓：纯脚本的宿主（判据里的裸机器 ✓）与「引擎 bug」那条路
保持原样 ✓——不假装自己能变出一个错误对象 ✗。

```ts
try {
  return body();
} catch (error) {
  if (error instanceof Error && error.message === "out of room") {
    this.Status = VmStatus.OutOfMemory;
    return Value.Undefined();
  }
  // **其余一律试着抬成脚本站内异常**（第 127 轮）：装了工厂才抬 ✓。
  if (this.MakeError !== null) {
    this.DoThrow(this.MakeError(kind, this.HostText(error)));
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
