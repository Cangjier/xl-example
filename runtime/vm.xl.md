# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapFrame, HeapPromise, HeapTable, ObjectCharge, ValueCharge, CodeUnitCharge, PropertyCharge, GeneratorState, PromiseState } from "./heap.xl.md"
import { Collector, RootSet } from "./gc.xl.md"
import { Program, Instruction, Op, RtOpName, RtOp, FunctionInfo, BuiltinBase } from "./ir.xl.md"
import { IdTable, LoadedProgram, Load } from "./ir-verify.xl.md"
import { FrameStack } from "./frame.xl.md"
import { RtAdd, RtSub, RtMul, RtDiv, RtMod, RtNeg, RtNot, RtBitAnd, RtBitOr, RtBitXor, RtBitNot, RtShl, RtShr, RtUShr } from "./rt.xl.md"
import { RtCmpLt, RtCmpLe, RtCmpGt, RtCmpGe, RtCmpEqStrict, RtCmpEqLoose, RtToBoolean, RtIsNullish } from "./rt.xl.md"
import { RtNewClosure, RoomChecker, RtToString, RtTypeOf, RtSetProto, RtGetProto, RtInstanceOf, RtChainHas, TextUnitsOf, TruthyOf, ToNumberOf, MakeNumber } from "./rt.xl.md"
import { GetProperty, SetProperty, SetHiddenProperty, DeleteProperty, HasProperty, GetIndex, SetIndex, ArrayIndexAt, IsLengthKey, IndexAccessorAt } from "./props.xl.md"
import { GetPropertyFrom, SetPropertyFrom } from "./props.xl.md"
import { NewPlainObject, NewPlainArray, InitProtos, Protos, NativeCall } from "./props.xl.md"
import { HostTextUnits } from "./host-text.xl.md"
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
`kind` 那一格写的是 **`number`**，不是 `int`（第一版写成 `int`，
编译期报「Cannot find name 'int'」，位置正好在这一行——**这条规矩只有踩过才记得住**）。

# const ErrorKindGeneric:int = 0

**一次普通的失败**（第 139 轮）——默认那一档。

# const ErrorKindType:int = 1

**一次「类型」失败**（第 139 轮）：`null.y`、`undefined[0]`、`x` 不是函数却调用它——
JS 那边这一类全是 **`TypeError`**，而**「叫这个名字」是语言层的事**。

**引擎只报「这是哪一类失败」**（这是引擎-level 的事实：它知道自己在做类型检查），
**语言层把它翻成名字**（`TypeError` / `Error`）——与 `PrototypeKey`（名字由语言层给）、
`SetErrorFactory`（错误长什么样由语言层定）是**同一条分界**。

**为什么不能直接传名字**：引擎一旦认识 `"TypeError"` 这几个字母，
换一门语言（Python 的 `TypeError` 也是这个名字，但 Dart 不是）就得改引擎——
而这一层存在的全部意义就是「引擎不认识语言」。

# const ErrorKindRange:int = 2

**一次「范围」失败**（第 228 轮）：JS 那边这一类是 **`RangeError`**。

**它为什么现在才出现**：`ErrorKindType` 是第 139 轮为「引擎自己认出类型错」加的，
而**语言层（建库层）抛的 `RangeError`** 原来走的是**另一条路**
（宿主通道的 `RaiseFromHost`，第 227 轮已经按宿主的类映射过了）。
这一格补的是**引擎自己**那条路——两处各管各的一半，
判据 `array-reduce` / `symbol-concat-throws` 量的正是**后者**那一条。

# type HostInvoker = (target:Value, self:Value, args:Array<Value>, room:RoomChecker, constructThis:Value)=>Value

# type TaskScheduler = (promise:Value, callback:Value, args:Array<Value>, result:Value, wants:number, carry:boolean, onRejected:Value)=>void

# type TaskSettler = (promise:Value, value:Value, rejected:boolean)=>void

**「结清一个承诺」的形状**（第 186 轮）：语言层拿它交答案——
**承诺、值、是不是拒绝那一档**。

**为什么必须有这一格**：`.then` 那一条路是「引擎拿回调的返回值去灌」，
而 `Promise.all` **不是那个形状**——它要在**最后一个**输入到齐时才交答案
（早一步交就是错的）。建库层自己改承诺的状态**不行**：
那只把状态改了、**没有把等着它的回调排进微任务**（症状是「一声不响地结束」，
实测过）。所以结清这件事**必须走执行器**——它就是 `ResolvePromise` / `RejectPromise`。

**「挂一个原生任务」的形状**（第 185 轮）：语言层只交四样东西——
**源承诺**（还在等就挂在它身上）、**回调**、**实参**、**结果承诺**。

**判据在引擎那一侧**（`ScheduleTask`：「还在等吗」只有引擎知道）；
语言层**不该**先自己去读承诺的状态——那要把 `PromiseState` 那套搬到库里，
而且两处判据迟早走偏。
**把一次宿主函数调用交给宿主**：`target` 是那个 `HostRef`（**它自己带着「是哪一个」
——`HostRef.CapabilityId`，内建方法就靠它分派**），`self` 是接收者（普通调用给 `undefined`），
`args` 是**拷过去**的参数数组（宿主拿不到 vm 的槽——那是「值语义」这条安全要求在 ABI 上的样子），
`room` 是「分配前问一句」的回调（**宿主函数要分配就必须问**，否则绕过资源预算）。

**返回值必须是一个完整的 `Value`**：宿主想长期留着它，得先 `Retain`
（`host-abi.xl.md` 的借用规矩）——回收器看不见宿主语言里的变量。

# type InvokeCallback = (callee:Value, self:Value, args:Array<Value>)=>Value

**「同步调一个脚本值」的形状**（第 285 轮）——`InvokeValue` 那个方法面朝语言层的形状。

**谁问它**：`new Promise(执行器)`（`promise.xl.md` 的 `PromiseCtor` 那一支）——
执行器**必须同步跑一次**（JS 的口径：`new Promise((r) => { console.log("x"); r(1) })`
在**这一句**里就印 `x`），而建库层手上只有 `call`（`NativeCall`）——
那个形状是**建库层被动**的（宿主调它），**主动调**要另给一格。

**与 `NativeCall` 的差别只有「谁发起」**：两者最终都走 `CallNative`
（压帧、跑到返回、取返回值）——`NativeCall` 是「宿主 → 脚本」、
这一条是「脚本层的内建 → 脚本」。**返回值同样是 `Value`**，
失败时给 `undefined`（真的失败了吗，用下面那一格问）。

# type ThrownTaker = ()=>Value

**「上一次同步调用抛了吗；抛的是什么」的形状**（第 285 轮）——
`TakeThrown` 那个方法面朝语言层的形状（`Invoker` ↔ `InvokeCallback` 同一个手法）。

**非 `Threw` 一律给 `undefined`**——调用点写成 `if (thrown.Tag !== ValueTag.Undefined)`
（见 `promise.xl.md` 的 `PromiseCtor`）。

# type IteratorDrain = (source:Value)=>Value

**把「引擎认得的可迭代物」走完，产出的值收成一个新数组**（第 199 轮）——
`DrainIterator` 那个方法面朝语言层的形状。

**谁问它**：四个**急切**的入口——解构（`const [a, b] = g()`）、展开（`[...g()]`）、
`Array.from(g())`、`new Set(g())` / `new Map(g())`。
**`for..of` 不问它**：那一条是**惰性**的（`break` 只该走那么远，
而「无限生成器 + `break`」是真实代码），所以 `get_iterator` 那条老路一个字都不改。

# type NextStep = (iterator:Value, sent:Value, keep:RootKeeper | null)=>Value

**推进一步生成器，给回 `{ value, done }` 那个对象**（第 229 轮）——
`NextStepOf` 那个方法面朝语言层的形状。

**谁问它**：`it.next()`（`GeneratorNextId` 那一格，见 `globals.xl.md`）。

**为什么不复用 `IteratorDrain`**：那一个是「**走完**、收成一个数组」（急切），
而 `next()` 要的是**一步**、而且形状是 `{ value, done }`（不是数组）。
两件事的共同点只有「都在推生成器」——把两个形状塞进一个服务，两边的调用点都要多拆一层。

# type RootKeeper = (value:Value, on:boolean)=>void

**把语言层手里的一个值挂进根集 / 摘下来**（第 199 轮）。

**为什么语言层需要它**：回收器只看 `SnapshotRoots` 那张名单（帧栈 / 常量 / 原型表 /
待处理异常 …）——**语言层自己 `NewPlainArray` 造出来的中间数组不在名单里**。
于是「造一个数组 → 循环里调脚本 → 往数组里收」这个形状**有一个真实的窗口**：
循环里任何一次 `room(...)` 都可能触发回收，而那一刻这个数组**没有根**。

**它不是理论**：`[...一个 6 万项的 Symbol.iterator]` 在 `invalid handle` 上炸过
（第 199 轮实测）——数组被收走之后 `Push` 落在一个死句柄上。
**四万格以内看不出来**：阈值没到就一次都不回收——
正是「测试绿、线上收掉活对象」那一种最难查的（`gc.xl.md` 的 `BeforeAllocate` 写着这一条）。

**它收的是「值」不是「句柄」**（第 199 轮实测之后改的）：语言层手里那些东西
**大多可能不是引用型**（读出来的一项、一个 `next()` 的返回值），
按句柄收就得让每一处先判一次 `IsRef`——写成收值，非引用型那一档落成 `0`、
回收器按 `> 0` 过滤掉它，两头都简单。

**摘的时候按值找、不按栈顶弹**（也是实测改的）：语言层那几处循环里
**有 `break` 也有 `throw`**，栈顶弹出要求「挂与摘严格配对、且顺序相反」——
那是一条一写错就**收掉别人的根**的规矩（比泄漏危险得多）。
按值找最坏是漏摘一个（只多留一个对象，而 `SnapshotRoots` 那道 `IsValid` 闸门
把死句柄挡住）。

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

# const PromiseThenId:int = 235

# const PromiseCatchId:int = 236

# const PromiseFinallyId:int = 237

**`then` / `catch` / `finally` 三格的号**（第 285 轮）——见 `MakeAsyncPromise`。

**为什么引擎里会出现三个「语言层的号」**：这正是 `ConstructorProtos` / `SetErrorFactory` /
`PrototypeKey` 那一套分界的**同一个形状**——引擎**不认识 `"then"` 这个词的意思**
（它只是把一个号放进一个属性格），而**号是语言层的约定**
（`promise.xl.md` 的那三格）。三个号在那边是**公开的常量**，
这一层照抄——两边对不上就是「挂上去的方法调不了」
（症状是 `capability is not registered: 235`，听起来像谁忘了登记）。

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

## field Depth:int = 0

`try_push` 时那一帧**在栈上的层深**（第 228 轮）。

**它为什么必须记下来**：异常展开到「最外面的那个处理点」时，
**外面那条语言内建的循环必须收摊**（`CallFailed`）——而「外面」这件事
只有**层深**说得清：处理点的层深 **≤** 重入那一段的起点层深 ⇒ 它在外层
（这一趟重入整个被展开了）。**记 `Frame` 句柄不够**：
句柄能回答「那一帧还在不在栈上」，答不了「它在不在**我这一层**之上」。

## field Pc:int = 0

出事时要跳到的指令（从异常表那一项抄下来）。

## constructor:(frame:int, pc:int)=>void

记一个处理点。

**`Depth` 从 0 起、由 `try_push` 填**（第 228 轮）：构造参数里**不加它**——
那会让每一个 `new HandlerEntry(` 的调用点都要多传一格，而写它的地方只有一个
（`Op.TryPush` 那一支，那里正好知道层深）。

```ts
this.Frame = frame;
this.Pc = pc;
this.Depth = 0;
```

# class NativeTask

**一个原生任务**（第 185 轮）：`.then(fn)` 挂上来的那一格。

**三样东西**：调哪个闭包（`Callback`）、给它什么实参（`Args`）、
它的返回值灌进哪个承诺（`Result`——没有就是 `undefined`，比如 `Promise.all`
那一步是**自己**去结清结果承诺的）。

**它住在执行器里、由 `Microtasks` 按号排队**（见那两段的说明）。

**空槽复用**：跑完把 `Callback` 清成 `undefined`、`Args` 清空——
于是「这一格是不是空的」只看 `Callback` 是不是引用（`IsRef`）。

## field Callback:Value = new Value()

要调的闭包（`undefined` = 空槽）。

## field Args:Array<Value> = []

给它的实参。**跑的时候会再往后接一个**：这一格承诺结清后的值
（于是回调的形状是 `(…挂上时的实参, 结清值)`——`Promise.all` 那一步正靠它收值）。

## field Result:Value = new Value()

返回值灌进哪个承诺（`undefined` = 不管）。

## field Reject:bool = false

**源是「被拒绝」那一档吗**（`RejectPromise` 排它的时候置上、`ResolvePromise` 清掉）。

## field Carry:bool = true

**回调的返回值要不要灌进结果承诺**（第 185 轮）：`.then` / `.catch` 要
（链式就靠它）；**`Promise.all` / `race` 那两步不要**——它们**自己去结清**结果承诺
（`all` 要等到最后一个到齐）。**这一格不能省**：两步回调各自返回 `undefined`，
引擎若顺手灌进去，`Promise.all` 的结果会在**第一个**输入到齐时就被兑现成 `undefined`
（实测就是这个症状：`xs.join` 报「读 undefined 的属性」）。

## field OnRejected:Value = new Value()

**拒绝那一档要调的**第二个**回调**（第 187 轮）：`Promise.then(f, g)` 那个 `g`。

**为什么它是任务的一格、而不是两步任务**：挂两步（一步只认兑现、一步只认拒绝）
会**互相踩**——拒绝到来时，那一步「只认兑现」的回调虽然不跑，
但它的**传播**会把结果承诺先拒绝掉，接着 `g` 去兑现同一个承诺就是**空操作**
（结果停在「拒绝」上，而 JS 要的是 `g` 的返回值）。**一步两条路**才对。

## field Wants:int = 2

**这一格只认哪一档**（第 185 轮；`3` / `4` 是第 187 轮加的）：

| 值 | 意思 |
| --- | --- |
| `0` | 只认兑现（`.then(f)`；拒绝那一档**原样传下去**） |
| `1` | 只认拒绝（`.catch(g)`；兑现那一档原样传下去） |
| `2` | 两档都调同一个回调（`Promise.all` / `race` 那两步） |
| `3` | **两档各一个回调**（`.then(f, g)`——拒绝时调 `OnRejected`） |
| `4` | 两档都调、然后**把源那一档原样传下去**（`.finally(cb)`——回调的返回值**不算数**） |

**不匹配就跳过回调、把源那一档原样传下去**——那正是 JS 的 `.then` 语义
（`.then(f)` 遇到拒绝时 `f` 不跑、拒绝继续往下走）。
**这一格必须由引擎执行**（不是库里的一句 `if`）：回调是**引擎**调的，
库里拿不到「现在这一趟是哪一档」。

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

**微任务队列**：等着跑的**帧句柄**（`await` 挂起来的那些），
以及**原生任务**（第 185 轮：语言层的 `.then(fn)` 挂上来的回调）。

**两种任务装在一个队列里**（不是两个）：JS 的微任务队列是**一条先进先出**的——
`await` 醒过来的那一段与 `Promise.then` 的回调**谁先挂上谁先跑**。
分成两条队列，两边的次序就变成「哪条先排空」（症状是 `console.log` 的行序与 Node 不同，
而每一行单看都是对的，最难查的一种）。

**编码**：`>= 0` 是帧句柄；`< 0` 是原生任务的号（`-号 - 1`，见 `NativeTasks`）。

**它是 VM 自己的队列，不是宿主的 `async`**：宿主的 async 一进来，
「同 IR + 同输入 = 同输出」这条判据就没了，而且没有 async 运行时的 C++ 客户当场跑不了。

**它必须是根**：队列里的帧带着活值，而它们不在帧栈上（`SnapshotRoots` 把它们加进去）。

## field NativeHosts:Array<int> = []

**挂着原生反应的承诺句柄**（第 185 轮）——**扫根要按这张名单去找任务**。

**为什么需要它**：挂在**还在等**的承诺上的任务**不在微任务队列里**
（队列里只有「已经可以跑」的那些），所以扫根时按队列走**看不到它们**——
症状是「回调闭包某天被回收掉」（只在堆压满时出现，最难复现的一种）。
结清时（`ResolvePromise` / `RejectPromise`）那一格会被移出去。

## field NativeTasks:Array<NativeTask> = []

**原生任务表**（第 185 轮）：`.then(fn)` 那类**由语言层挂、由执行器调**的回调。

**一格就是「调哪个闭包、给什么实参、结果灌给哪个承诺」**（见 `NativeTask`）。

**为什么由执行器拿着**：调一个闭包要**建帧、跑循环、取返回值**——那是执行器的活
（语言层只拿得到 `call`，那是**同步**重入，而 `.then` 要的恰恰是**推迟**）。

**空槽复用**（`Callback` 不是引用就是空槽）：表按「历史上有过多少任务」长，
不回收的话一个长跑脚本会一直涨。

## field Retained:Array<int> = []

**宿主拿住的那些值的句柄**（`Retain` / `Release`）。

**为什么必须有它**：脚本停在 `await` 上时，那一帧只被承诺指着；如果宿主也拿着那个承诺
（通常正是它触发的），这整条链在回收器眼里**没有任何根**——一轮回收就会把挂起的脚本
连同承诺一起收掉。所以「宿主拿住」必须是一条**显式的根**，而不是靠宿主语言里那个引用
（回收器看不见宿主语言的变量）。

**它必须是根**（`SnapshotRoots` 加进去）。

## field HostTable:Array<Value> = []

**能力表**：内建 id → 宿主注册进来的 `HostRef`（下标是 `id - BuiltinBase`）。

## field Temps:Array<int> = []

**临时的根**（第 199 轮）：语言层**自己造出来、要跨过一次脚本调用**的中间堆对象。

**为什么它必须存在**：`SnapshotRoots` 那份名单只有帧栈 / 常量 / 原型表 / 待处理异常
那几处——语言层手里的中间数组**不在里面**，于是「造一个数组 → 循环里调脚本 →
往数组里收」有一个真实的窗口（第 199 轮实测：6 万项的 `Symbol.iterator` 展开
在 `invalid handle` 上炸过）。`DrainIterator` 与语言层那条协议循环都靠它。

**它必须是根**（`SnapshotRoots` 加进去）——与 `Retained` 同一条理由。

**它很短命**：`KeepRoot(h, true)` 挂上、`KeepRoot(h, false)` 摘掉，
两头都在同一次宿主调用里（不是 `Retained` 那种「宿主一直拿着」）。

## field PrototypeKey:int = 0

**构造函数把原型挂在哪个属性名下**（一格字符串句柄，由语言层给；`0` = 没设）。

**引擎不知道那是哪个字符串**：它只把这格句柄当键去查属性（`DoNew`）。
给 `0` 时 `new` 一律用 `Protos.Object`——**没接上时不说谎，只是不特殊**。

## field DescriptionKey:int = 0

**`s.description` 里的 `description` 是哪个字符串**（一格字符串句柄，由语言层给；
`0` = 没设）。

**为什么符号这一格要引擎特判**：符号**不是一个对象**（`ValueTag.Symbol`，
没有属性表、也没有原型那一格）——`GetProperty` 那条路**走不到它**，
于是 `Symbol("tag").description` 给 `undefined`（而 JS 给 `"tag"`，
判据 `symbol-description` 就是这么红的）。

**为什么这不算「引擎认识语言层」**：引擎**只认句柄**——
`description` 这个字符串是**语言层造的**（与 `PrototypeKey` / `SetErrorFactory`
同一套做法），引擎按**内容**比一次（字符串不去重，比句柄永远不相等——
这一条与 `PrototypeKey` 那一处踩过的坑**一字不差**）。
**描述本身就在堆里那一格**（`HeapSymbol.Description`），所以特判那一支
**不用调回语言层**——一格都不用分配。

## field ConstructorProtos:Array<int> = []

**内建构造函数 → 原型对象**那张登记表（第 137 轮），**扁平的成对数组**
（`[号, 句柄, 号, 句柄, …]`）。

**为什么内建构造函数需要它**：它们是 `HostRef` 值，**没有属性表**——
所以 `GetProperty(它, "prototype")` 永远给 `undefined`，
`instanceof` 于是抛「the right side of instanceof has no prototype object」。
**实测这一句是整族红的**：`[] instanceof Array`、`new Map() instanceof Map`、
`new Error("x") instanceof Error` **全都**是它——**没有一个内建构造函数**能当 `instanceof` 的右边。

**为什么不让引擎认识那几个号**：那是语言层的东西（`ErrorCtor` = 280 是建库层的约定）。
引擎只提供**一格**（号 → 原型句柄），往里写什么由语言层决定——
与 `SetErrorFactory`（第 127 轮）、`PrototypeKey`（名字由语言层给）是同一套做法。

装载时按 id 表的大小开好、**每格是空的 `Value`**；宿主随后用 `RegisterCapability` 填。
`host_call` 只在**这一格真的是 `HostRef`** 时才发出去——所以「白名单」是两层：

1. **装载验证**：`rt_call` 的那个 id 必须在 **id 表**里（不在就直接拒绝装载）；
2. **运行期**：这个 id 必须**真的注册过**（没注册就报「能力未注册」，而不是给个 `undefined`）。

**它必须是根**：注册进去的是堆对象。

## field Host:HostInvoker | null = null

宿主函数的调用通道；`null` 表示这台机器**不带宿主**（纯脚本）。
这时候遇到 `host_call` 就直接报错——**不许静默返回 `undefined`**。

## field HostConstructThis:Value = new Value()

**`new` 底下新造的那个实例**（第 617 轮）——**只在「宿主可调用值当构造函数」
那两条路上为真**（与 `HostConstructing` 同一对窗口）。

**为什么单开一格**：`bind` 造出来的那个对象**只有拿到自己**才读得到
`__boundTarget` / `__boundThis` / `__boundArgs` 三样载荷（`IsBoundCall` 那一段的账），
所以 `HostInvoker` 的 `self` 必须是**它**；而 `new` 底下**目标函数**要的 `this`
是**新造的那个实例**——**一个 `this` 位表达不了两件事**
⇒ 实例单独占一格（`BoundCall` 从第五格取它）。
**它不是给普通构造函数用的**：那一条路的实例本来就是 `thisValue`
（`DoCallValue` 的 `thisValue` 参数），这一格只补「`self` 被 `bind` 占掉」那一档。

**为什么不给 ABI 加参数**：`HostInvoker` 是**公开契约**
（`host-abi.xl.md`、客户要照着实现），加一位就是一次破坏性改动——
所以照 `HostConstructing` 的老办法，**一格机器状态 + 一层门面**
（`HostInvoker` 自己的签名**一位都没动**，多出来的第五格是**驱动**在
`InstallHost` 里现取现传的，见 `tsrun.xl.md`）。

**窗口与 `HostConstructing` 逐字相同**：`DoNew` 置上、调完立刻还原，
嵌套的 `new` 靠**后进先出**自然成立（`DoCallValue` 那一段存的是**上一个值**，
所以内层还回来的是外层那一个，不是无条件清零）。

**它必须是根**（`SnapshotRoots` 加进去）——它是**实例**，
而 `HostConstructThis` 活着的那一段正是宿主在跑脚本、随时可能回收。

## field HostConstructing:bool = false

**这一次宿主调用是不是从 `new` 来的**（第 232 轮）——**只在「宿主可调用值当构造函数」
那两条路上为真**（`DoNew` 的两支），别的路都是假。

**为什么必须告诉宿主**：JS 里 `F(...)` 与 `new F(...)` **可以给不同的答案**，
而最普通的一例正是 `Object`——`Object(null)` 是 `null`、
`new Object(null)` 是**一个空对象**（构造那条路永远给新对象）。
本仓的宿主 ABI 只有 `(id, self, args)`（`HostInvoker`），
**分不出这两件事**——于是语言层只能二选一，而**两边都是错的**
（判据 `global-array-object-ctors` 现场红的）。

**为什么用「一台机器一位」而不是给 ABI 加参数**：与 `HostConstructThis` 同一条理由
（`HostInvoker` 是公开契约，加一位是破坏性改动）。这一位同样是**瞬时的**——
`DoNew` 在调 `DoCallValue` **之前**置上、调完**立刻**清掉
（见 `DoNew` 那两条分支），窗口里只有这一次调用。
嵌套的 `new` 也没问题：内层清掉的是**它自己**置的那一位，
外层那一位在它整段跑完之后才被清（后进先出）。

## field Finished:bool = false

**入口函数到底返回了没有**。

`Halted` 这个词不够用：脚本停在 `await` 上时机器也是 `Halted`（帧不在栈上、等承诺），
宿主必须分得清「跑完了」和「挂着等别人兑现」。分不清的话，客户会拿到一个
`undefined` 却以为是结果——**`host-abi.xl.md` 里这两件事是两个不同的结局**。

**它必须是根**（`SnapshotRoots` 加进去）。

## field MakeError:ErrorFactory | null = null

**把「宿主异常的文字」变成「脚本要接住的值」的工厂**（第 127 轮补）——见 `Guard` 那一段。

**为什么引擎不自己造**：脚本要接住的是一个**值**（`Error` 对象，带 `message`），
而「`Error` 长什么样」是**语言层**的事（`globals.xl.md` 的 `NewError`）——
引擎不认识它。所以它只是一个**回调**（不是堆里的值，**不用进根集**）。

**`null` = 没装**：没装就照旧把异常冒出去（纯脚本的机器、以及「引擎 bug」那条路）。

## field RaiseRequest:Value | null = null

**「请把这次宿主调用当成一次脚本站内异常」的请求**（第 121 轮补）。

**为什么需要它**：宿主函数（内建方法、客户能力）失败时**手上有的是宿主异常**
（TS 的 `Error`、C++ 的 `std::runtime_error`），而脚本要有的是**一个能被 `try` 接住的值**
（`Error` 对象）。宿主异常**没有**这条通道：它从调用点直接冒出 `Run()`——
于是 `try { JSON.parse(bad) } catch {}` 这种写法在脚本里**接不住**，
整份程序以「语言层错误」收场。**这一格就是那条通道**：宿主构造好脚本要的那个值、
放进这一格，引擎在**宿主调用返回之后**把它当成一次 `throw` 走展开。

**它必须是根**：放进来的是堆对象（`Error` 对象），而从「放进来」到「被取走」之间
**可能发生分配**（宿主返回前还可能干别的活）。

**消费点是宿主调用的两处**（`DoCallValue` 的宿主分支与 `rt_call` 的 `host_call`）：
两处都在调用返回之后**立刻**看这一格，取走并清空——**只在那一瞬有效**，
不是「一直排队」（那样第二次调用会莫名其妙地抛上一次的错）。

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

## field Throws:int = 0

**这台机器一共抛过几次**（第 228 轮）——一个只增不减的计数，`CallFailed` 的第二半靠它。

**为什么是「计数」而不是「一个布尔标志」**：要回答的问题是
「**这一次**重入里出过事没有」，而一个布尔标志回答的是「**曾经**出过事没有」——
后者会被**上一次已经处理掉的**异常污染（实测现场：`try { throw } catch {}` 之后，
后面每一次 `map` / `forEach` 都读到「真」，于是内建全都提前收摊）。
计数一减就知道这一次有没有变（`CallNative` 在压帧前后各读一次）。

**`int` 会不会溢出**：它是 `i32`，而一次运行里抛过二十几亿次异常是不可能的
（`StepBudget` 先到）。

## field NativeFailed:boolean = false

**上一次 `CallNative` 里出过事**（第 228 轮）——`CallFailed` 的第一半。

**它只用来说明「刚刚那一次重入」**，所以**每次重入都会整个覆盖写**
（不是「置真之后留着」，见 `Throws` 那一段）。

## field NativeEscaped:boolean = false

**刚刚那一次展开跨过了「重入那一段」的边界**（第 228 轮）——`CallFailed` 的第三半。

**它补的是 `Throws` 那一半漏掉的路**：回调**不一定**走 `CallNative`——
语言内建**直接调**闭包时走的是 `DoCallValue`（压帧 + 分派循环），
那条路上 `Throws` 一个数都没变（现场：`sort` 的比较器里抛，
而同一次运行里**在它前面**已经抛过一次、还被脚本接住了 ⇒ 计数没变 ⇒ 内建照旧转下一圈）。

## field NativeBoundary:int = 0

**当前这一趟 `RunToDepth` 的起点层深**（第 228 轮）——`DoThrow` 拿它判
「处理点是不是在外层」（见 `HandlerEntry.Depth`）。

**它由 `RunToDepth` 每一趟写**：一趟里 `Frames.Depth()` 会变，
可这个边界**从头到尾不动**（它就是「我这一趟从哪一层开始的」）。

## field BoundCallId:int = 0

**「`bind` 造出来的那个对象」那格载荷的能力号**（第 343 轮）——由语言层在
`RegisterBoundCall` 里告诉引擎，与 `GeneratorNextId` **同一条形状**。

## field ThenableHookId:int = 0

**「问一句：这个值是可采纳对象吗」那个能力号**（第 359 轮）——由语言层在
`RegisterThenableHook` 里告诉引擎，与 `BoundCallId` **同一条形状**。

## field PropertyKeyHookId:int = 0

**「把这个值变成一个属性键」那个能力号**（第 750 轮）——由语言层在
`RegisterPropertyKeyHook` 里告诉引擎，与 `ThenableHookId` **同一条形状**。

**为什么这一档要问语言层**：`ToPropertyKey` 对**对象**的第一步是 `ToPrimitive`
（先 `toString` 后 `valueOf`，还有 `Symbol.toPrimitive`）——那要**读属性、还可能要调它**，
而引擎侧的 `TextUnitsOf` 对对象是**响亮地抛**（那一处的注释写着「那是建库层的事」）。
**谁需要它**：`get_index` / `set_index` 那两条 rt 算子的键
（`t[new Set()] = "x"`——**整份文件跑不起来的**那一档）。
**给 `0` 表示语言层没登记过**：那时对象键照旧走引擎那条路（响亮地抛，
与第 750 轮之前**一字不差**——**行为不变**是这一格的纪律）。

**为什么这件事要问语言层**：判据是「有没有一格**可调的** `then`」——
那要**读属性、还可能要调它**，而引擎**不认识那个名字**（`Symbol.hasInstance` /
`Symbol.toPrimitive` 那两处也是把名字交给语言层的小表，同一条分界）。
**给 `0` 表示语言层没登记过**：那时这一档整段跳过、**行为一字不改**。

**为什么引擎要记这一格**：`this` 从哪来这件事**两条路要的东西相反**——
`bind` 的对象要**自己**、其余可调用对象要**调用方给的接收者**（见 `IsBoundCall` 的账）。
**给 `0` 表示语言层没登记过**：那时这条判据恒为假、
**所有**可调用对象都按「调用方给的 `this`」办（`HostRef.CapabilityId` 的默认值也是 `0`，
所以这一条不能省——省了就静默走错分支）。

## field GeneratorNextId:int = 0

**「生成器的 `next`」那格载荷的能力号**（第 229 轮）——由语言层在
`RegisterGeneratorMethods` 里告诉引擎。

**为什么引擎要记这一格**：`it.next()` 最终落到一条**宿主调用**上，
而这条调用**不该发给宿主**——它要落到引擎自己的 `NextStepOf`。
判据就是「载荷号是不是这一格」（`GeneratorStepKind`）。

**给 `0` 表示语言层没登记过**：那时候这条判据恒为假
（与 `PrototypeKey` 给 `0` 时的纪律一字不差：**不说谎，只是不特殊**）——
**`0` 必须显式排掉**：`HostRef.CapabilityId` 默认就是 `0`，
不排掉的话「任何一个没登记过的宿主引用」都会被当成生成器的 `next`。

## field GeneratorReturnId:int = 0

**「生成器的 `return`」那一格的能力号**（第 313 轮）——与 `GeneratorNextId` 同一条纪律
（同一个登记入口一次告诉引擎三个号）。

## field GeneratorThrowId:int = 0

**「生成器的 `throw`」那一格的能力号**（第 313 轮）——同上。

## field SettleResolveId:int = 0

**「执行器递出来的 `resolve`」那一格的能力号**（第 318 轮）——由语言层在
`RegisterSettleCallbacks` 里告诉引擎。

## field SettleRejectId:int = 0

**「执行器递出来的 `reject`」那一格的能力号**（第 318 轮）——同上。

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
// **原生任务表也要清**（第 185 轮）：它与 `Microtasks` 是一对——
// 队列里那些负数下标指的是这张表里的格，两者不同步就是悬着的号。
this.NativeTasks = [];
this.NativeHosts = [];
this.Retained = [];
this.HostTable = [];
this.Host = null;
this.Finished = false;
this.RaiseRequest = null;
this.MakeError = null;
this.StepBudget = stepBudget;
this.Steps = 0;
this.Status = VmStatus.Ready;
this.Throws = 0;
this.NativeFailed = false;
this.NativeEscaped = false;
this.NativeBoundary = 0;
this.GeneratorNextId = 0;
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
// **`new` 底下那个实例也是根**（第 617 轮）：它在 `HostConstructThis` 那一格上，
// 而那一格活着的那一段**正是宿主在跑脚本**（`BoundCall` 会把目标函数调起来，
// 目标函数体里随时可能分配、随时可能触发回收）——
// 漏了它的症状与 `Retained` 那一族一字不差：**实例某天被收走**，
// 而目标往里写属性时读到一个死句柄（报的是 `invalid handle`，离现场很远）。
if (this.HostConstructThis.IsRef()) this.Roots.AddValue(this.HostConstructThis);
for (let i = 0; i < this.Microtasks.length; i++) {
  const entry = this.Microtasks[i];
  if (entry >= 0) {
    this.Roots.AddHandle(entry);
    continue;
  }
  // **原生任务里的值也是根**（第 185 轮）：任务拿着一个闭包与一串实参，
  // 它们**不在帧栈上**（与微任务里的帧同一个理由）。
  // 漏了这一步的症状是「回调闭包某天被回收掉」——而它只在**堆压满**时才出现，
  // 是最难复现的一种。
  const task = this.NativeTasks[0 - entry - 1];
  if (task.Callback.IsRef()) this.Roots.AddValue(task.Callback);
  for (let j = 0; j < task.Args.length; j++) {
    if (task.Args[j].IsRef()) this.Roots.AddValue(task.Args[j]);
  }
  if (task.Result.IsRef()) this.Roots.AddValue(task.Result);
}
// **挂在「还在等」的承诺上的任务**（第 185 轮）：它们不在队列里，
// 所以要顺着 `NativeHosts` 那张名单找到承诺、再按反应表找到任务。
for (let i = 0; i < this.NativeHosts.length; i++) {
  const handle = this.NativeHosts[i];
  if (handle <= 0 || !this.Table.IsValid(handle)) continue;
  this.Roots.AddHandle(handle);
  const item = this.Table.Get(handle);
  if (item.Promise === null) continue;
  for (let j = 0; j < item.Promise.NativeReactions.length; j++) {
    const task = this.NativeTasks[item.Promise.NativeReactions[j]];
    if (task.Callback.IsRef()) this.Roots.AddValue(task.Callback);
    for (let k = 0; k < task.Args.length; k++) {
      if (task.Args[k].IsRef()) this.Roots.AddValue(task.Args[k]);
    }
    if (task.Result.IsRef()) this.Roots.AddValue(task.Result);
  }
}
for (let i = 0; i < this.Retained.length; i++) {
  this.Roots.AddHandle(this.Retained[i]);
}
for (let i = 0; i < this.HostTable.length; i++) {
  this.Roots.AddValue(this.HostTable[i]);
}
// **语言层挂上来的临时根**（第 199 轮）：`DrainIterator` 与语言层那两条循环
// 都在这张表里——少了它，「造一个数组、循环里调脚本、往数组里收」会被回收器
// 在中间收掉（第 199 轮实测：6 万项的展开报 `invalid handle`）。
// **`IsValid` 那道闸门不是多余的**：语言层那两处是**配对**用的（挂一个、摘一个），
// 而**中途抛出去**时那一对就配不上了——留下来的**死句柄**要是不过滤，
// `Mark` 会去读一个已经回收的槽（与 `NativeHosts` 那一趟同一条理由、同一道闸门）。
for (let i = 0; i < this.Temps.length; i++) {
  if (this.Temps[i] > 0 && this.Table.IsValid(this.Temps[i])) this.Roots.AddHandle(this.Temps[i]);
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
// **这一趟的边界**（第 228 轮）：`DoThrow` 拿它判「处理点是不是在我这一层之上」
// （见 `HandlerEntry.Depth` 与 `CallFailed`）。
// **写在外面还是里面都一样**（一趟里它不动），写在循环前面是为了让「它属于这一趟」
// 这件事一眼看得见。**退出时要还原**（第 331 轮，见这一段的末尾）——
// 从这一轮起 `DoThrow` 也要读它（判「这一帧在不在**这次**重入里面」）。
const outerBoundary = this.NativeBoundary;
this.NativeBoundary = depth;
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
// **边界要还原**（第 331 轮）——**这一句是跟着 `DoThrow` 那条判据一起来的**：
// 从这一轮起，`DoThrow` 拿 `NativeBoundary` 问「这一帧在**这次重入里面**吗」。
// **不还原就是一处静默的过期值**：一趟深的重入（`[1,2].map(x => new Promise(() => { throw }))`
// ——里层那一次 `RunToDepth(2)` 把边界写成 2）回来之后，
// 顶层再调一个「同步就抛」的 async 函数，它的帧在**第 1 层** ⇒ `1 >= 2` 为假
// ⇒ 那一抛**不再变成拒绝**，而是冒到宿主（与第 285 轮刚修好的那一格**恰好相反**）。
// **症状会离现场很远**（一会儿对、一会儿错，取决于前面跑过什么），所以这一句必须在这儿。
this.NativeBoundary = outerBoundary;
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
  // **真假走 `TruthyOf`，不走 `Value.AsBool`**（第 144 轮）：`if` / `while` /
  // `&&` / `||` / `?:` 的五条降级**全落在这一条指令上**，而 `AsBool` 把 `""` 判成**真**
  //（它看不到码元长度）。改一处、五条构造一起对——这正是「口径只有一份」的好处。
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
  // **在册的时候顺手记下它的层深**（第 228 轮）：这一个数就是
  // 「重入那一段跑完时要不要收摊」的判据（见 `DoThrow` / `NativeBoundary`）。
  // **在这里算一次是最省的**：展开那一刻帧栈正在变，而 `try_push` 这一刻
  // 它正好就是 `Frames.Depth() - 1`——一个减法，一趟线性扫都省了。
  // **为什么不能等展开时算**：`DoThrow` 里那一趟扫是**每一次抛异常**都要付的，
  // 而这条路径本来就贵（它连着处理点搜索）——能少扫一趟就少一趟。
  this.Handlers[this.Handlers.length - 1].Depth = this.Frames.Depth() - 1;
  return;
}
if (instr.Op === Op.TryPop) {
  // **弹的是「这一帧自己的」那一格**（第 620 轮）：`Handlers` 是**一条全局栈**，
  // 而挂起的帧**把手里的处理点留在里面**（`DoThrow` 靠 `IsSuspendedFrame` 留住它们）。
  // 于是「栈顶 == 我的」这条前提**不成立**：`for (;;) { try { await f() } catch { } }`
  // 里三个 async 帧同时挂在 try 里时，谁先恢复、谁就把**别人的**处理点弹掉了
  // ⇒ 那个帧再抛时**一个处理点都不剩** ⇒ 异常冒出去、**它自己的承诺被拒绝**
  //（症状：`Promise.all(workers)` 整条不结清，一个字都不印）。
  // **判据是帧句柄**：`TryPush` 记的就是它（见那一支）。
  const owner = this.Frames.TopHandle();
  for (let i = this.Handlers.length - 1; i >= 0; i--) {
    if (this.Handlers[i].Frame === owner) {
      this.Handlers.splice(i, 1);
      break;
    }
  }
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
if (instr.Op === Op.EnvLeave) {
  // **退出一层环境**（第 315 轮）——`EnvNew` 的反面（见 `ir.xl.md` 那一段）。
  // **没有父亲就响亮地抛**：那是**降级期多发了一条**，不是脚本的错
  //（静默不动就是「环境链悄悄短了一层」，而症状会出现在很远的地方）。
  const parent = this.Table.Get(frame.Env).AsEnv().Parent;
  if (parent <= 0) throw new Error("env_leave with no parent environment");
  frame.Env = parent;
  return;
}
if (instr.Op === Op.CheckGeneratorReturn) {
  // **生成器被 `return(v)` 叫停了吗**（第 336 轮）：见 `ir.xl.md` 那一段的账。
  // **不叫停就一条指令都不做**（这是热路径上的一条：每个 `yield` 后面都跟着它）。
  // **叫停时把**恢复值**搬进 `A`**：`return(v)` 的 `v` 走的就是 `ResumeValue` 那一格
  //（`DoIterNext` 写的，与 `next(v)` 是同一格）——降级层于是把**它**当成
  // 「这次 `return` 要交出去的值」（`Op.Return(A)`）。
  // **标记要清掉**：不clear的话，`finally` 里再 `yield` 一次之后
  // 那个标记还在 ⇒ **第二次也跳**（而 JS 那边 `return` 已经交给那个 `yield` 了）。
  if (frame.GeneratorReturnRequested) {
    // **值的来源是 `C`、不是帧上那一格 `ResumeValue`**（**实测踩过一次**）：
    // 紧接着的 `Op.Resume` **已经把它读走并清掉了**（那是它的本分），
    // 走到这里时它已经是空的——第一版就是读它，于是 `it.return(9).value`
    // 给的是**帧里某一格碰巧装着的东西**（实测拿到的是 `console` 那个对象，
    // **一句话都没报**）。
    // 所以来源由降级层指认：**它刚刚把恢复值放进哪一格**（`yield` 那一格），
    // 这里原样搬过来。
    frame.Slots[instr.A] = frame.Slots[instr.C];
    frame.GeneratorReturnRequested = false;
    frame.Pc = instr.B;
  }
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
if (instr.Op === Op.LoadNewTarget) {
  // **`new.target`**（第 346 轮）：帧上那一格——构造调用时是**被调的那个构造函数**、
  // 其余是 `undefined`（谁写进去的见 `DoCallValue` 那一段；
  // 「为什么它不是词法信息」见 `ir.xl.md` 那一段）。与上面那条**同一个形状**。
  frame.Slots[instr.A] = frame.NewTarget;
  return;
}
if (instr.Op === Op.Suspend) {
  this.DoSuspend(frame, instr);
  return;
}
if (instr.Op === Op.Resume) {
  // **恢复之后「被 `await` 摘下来」这一格就作废了**（第 319 轮）：
  // 它只描述「上一次为什么离开栈」——不清的话下一次被当成还在等（**静默错值**）。
  frame.SuspendedInAwait = false;
  // **两种恢复**（第 313 轮）：`next(v)` 是把 `v` 放进 `yield` 那一格；
  // 而 `it.throw(e)` 是**在挂起点抛 `e`**——那正是生成器体里 `try { yield } catch { }`
  // 能接住它的原因（JS 的 `GeneratorResumeAbrupt`）。
  // **判据走帧上那一格**（`ResumeRaises`，见它的说明），读完就清——
  // 不清的话下一次 `yield` 会**凭空抛一次**（**静默错值**）。
  // **第 330 轮它从机器搬到帧上**：`RejectPromise` 成了第二个写它的人，
  // 而一个被拒绝的承诺可能同时排着好几个等着它的帧 ⇒ 一格的机器装不下。
  if (frame.ResumeRaises) {
    frame.ResumeRaises = false;
    this.DoThrow(frame.ResumeValue);
    return;
  }
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

**`async` 帧的收尾在这里分岔**（第 285 轮）：`AsyncPromise > 0` 时**不在栈上**
（它是被 `await` 摘下来之后又恢复的），而且返回值**不写回调用者**——
调用者早就拿到承诺走了。「`return v`」在 async 里的意思是
**「那个承诺兑现为 `v`」**（`v` 本身又是一个承诺时按 JS 的采纳规矩跟着它走，
见 `SettleAsync`）。

**先把要读的都读出来，再弹帧**——弹出去的帧随时可能被回收复用，它的字段当场失效。

```ts
let value = Value.Undefined();
if (instr.A >= 0) value = frame.Slots[instr.A];
const returnSlot = frame.ReturnSlot;
const constructTarget = frame.ConstructTarget;
// **`this` 也要在弹帧之前读下来**（第 335 轮修的，见下面那一支）。
const thisValue = frame.This;
// **async 那一支要在弹帧之前把承诺号读下来**（弹出去的帧随时会被复用）。
const asyncPromise = frame.AsyncPromise;
this.Frames.Pop();
if (constructTarget > 0) {
  // **回退到「当初造出来的那个实例」时要连它的 `Tag` 一起留着**（第 335 轮）：
  // 原来是 `Value.FromObject(constructTarget)`——**把那个句柄重新包成一个「普通对象」**
  // ⇒ 实例上原来那个标签**当场丢掉**。
  // **症状**：`class MyList extends Array {}` 的 `new MyList()` 在构造函数体里
  // `Array.isArray(this)` 是**真**、出来就变成**假**（判据
  // `rt-instanceof-array-subclass` / `c323-rt-array-subclass-and-methods` 量的就是它）——
  // **同一个值，进去是数组、出来是对象**，而现场没有一句话提到「标签」。
  // **`frame.This` 本来就是那个实例**（`DoCallValue` 建的帧把它放在这一格、
  // 构造函数里没人能改它）——所以这里**原样用那个值**，一个字节都不重建。
  // **顺带把「`super()` 返回对象就换 `this`」那一条也写在明处**：本仓的模型里
  // `this` 在 `new` 那一刻就定好了、`super()` 的结果被丢掉（见 `CreateInstance` 那一处）。
  if (!value.IsObject()) value = thisValue;
}
if (asyncPromise > 0) {
  // **这条路上没有调用者要照顾**：async 帧开出来时 `ReturnSlot` 就是 `-1`
  //（承诺**在开帧那一刻就交出去了**，见 `DoCallValue` 的 async 那一支）——
  // 所以这里只管「把那个承诺结清」，返回的那个值**不给任何人**
  //（调用者手上是承诺，它要的值由承诺通道交）。
  this.SettleAsync(asyncPromise, value);
  return;
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
// **参数从哪来**（第 133 轮）：普通调用是「从 `argBase` 开始的 `argc` 格」；
// `call_array` 是「`argArray` 那一格里装着一个数组」。两处取参数（宿主分支与开帧分支）
// 都要能走这两条路——所以「有几个」与「第 i 个是谁」各收成一个方法，
// 而不是在两处各写一遍三元表达式（那正是**两处会走偏**的形状）。
const count = this.CallArgCount(frame, argBase, argc, argArray);
// **非严格的 `this`：普通函数调用收全局对象**（第 337 轮）。
//
// **JS 的规矩**：函数被**当作函数**调用（没有接收者）时，
// **非严格**的那一档 `this` 是**全局对象**（严格才是 `undefined`）；
// 「摘下来的方法」（`const f = o.who; f()`）走的正是这一档——
// 判据 `c304-rt-detached-method-this-undefined` / `c304-rt-iife-arrow-this` 量的就是它。
//
// **本仓原来一律给 `undefined`**（`ir.xl.md` 的 `LoadThis` 那一段写着
// 「严格模式语义」——那是一个**选择**，而这一轮按实测把它改成**非严格**：
// 与第 333 轮写屏障那条「本仓选定非严格」是**同一个决定**）。
//
// **全局对象由语言层给**（`Protos.Global`，与那张知名符号表同一条机制）——
// 引擎不认识「全局对象」这个名字，它只是把**那一格**递出去；
// **那一格是 `0`（宿主没接）就给 `undefined`**（**不说谎，只是不特殊**）。
//
// **只对闭包兜**：宿主那一档（内建方法）的 `this` 由调用点决定
//（`arr.push` 里的 `arr`），**不能动**。箭头也**不受影响**：
// 它的 `this` 是从**捕获的环境格**里读的（`lowering.xl.md` 的 `ThisKeyword`），
// 根本不看这一格。
//
// **`null` 与 `undefined` 是同一档**（**实测踩过一次**）：JS 的 `[[Call]]` 把
// 「`this` 是 `null` 或 `undefined`」**一起**换成全局对象（`f.call(null)` 与 `f()` 一样）——
// 第一版只写了 `undefined` ⇒ `who.call(null)` 给的是 `null` 本身（判据
// `c337-rt-sloppy-this-forms` 第 2 行当场红：Node 给 `global`、本仓给 `other`）。
// **严格闭包不兜这一格**（第 620 轮）：类体是严格代码，
// 所以「摘下来的方法」`const f = d.m; f()` 里 `this` 就是 `undefined`
// （判据 `c371-rt-super-and-this-binding`：Node 那一句 `this.v` 抛、本仓原来给 `Dundefined`）。
// **`"use strict"` 指令那一档由降级层认**（第 701 轮）：函数体开头的指令序言会把它记进
// `IsStrict`（`lowering.xl.md` 的 `HasUseStrictDirective`）；**文件级那一档仍然没有**
// （`.ts` 本仓按松散跑，第 337 轮选定）。引擎这一侧一个字都不用改——它认的一直是这一位。
if ((thisValue.IsUndefined() || thisValue.Tag === ValueTag.Null) && callee.Tag === ValueTag.Closure
  && !this.Table.Get(callee.Ref).AsClosure().IsStrict) {
  const globalProtos = this.Protos;
  if (globalProtos !== null && globalProtos.Global > 0) {
    thisValue = Value.FromObject(globalProtos.Global);
  }
}
// **可调用值的两种**（第 145 轮）：宿主引用，以及**带可调用载荷的对象**
//（`String(1)` 里的 `String` 是**对象**——它还要能挂静态属性，见 `heap.xl.md`
// 的 `AttachCallable` 那一段）。两者走的是**同一条**宿主通道——
// 判据收在 `IsHostCallable` 一处，取参数与展开也各只有一份。
//
// **对象那一档的 `this` 给「它自己」**（第 228 轮，与 `CallNative` 里那条同一条口径）：
// `bind` 造出来的函数要靠 `self` 才读得到自己那三格。
//
// **生成器的 `next` 要先截下来**（第 229 轮）：它也是一格宿主载荷，
// 但这条调用**不发回宿主**——引擎自己就能走这一步（`NextStepOf`）。
// **它必须排在这一整支的最前面**：落到下面那些分支上之后，
// 它会以「能力号 709 没注册」的形态报出来（那句话听起来像「谁忘了登记」，
// 而真相是「这一格本来就该由引擎自己答」）。
if (this.GeneratorStepKind(callee) !== 0) {
  // **`this` 就是那个生成器**：`DoCallMethod` 找出来的方法挂在**生成器对象**身上，
  // 而它的 `this` 是**接收者**（那个生成器）——与 `o.m()` 的规矩一字不差。
  //
  // **第一个实参要送进挂起点**（第 312 轮修的）：`it.next(10)` 在 JS 里让
  // **上一个 `yield` 表达式的值**成为 `10`——而这里原来**写死了 `Value.Undefined()`**
  // ⇒ `const got = yield 1` 里的 `got` 永远是 `undefined`（**静默错值**，
  // 判据 `rt-generator-next-sends-value` / `c291-rt-generator-forms`）。
  // **第一次 `next(v)` 的实参按 JS 的规矩丢掉**——那一格自然成立：
  // 第一趟帧从**函数头**开始跑，根本不会执行到 `Resume`（`ResumeValue` 写了也没人读）。
  const sentByCaller = count > 0 ? this.CallArgAt(frame, argBase, argArray, 0) : Value.Undefined();
  const stepKind = this.GeneratorStepKind(callee);
  // **`return()` / `throw()` 这两格今天响亮地抛**（第 313 轮）：
  // 它们要的不是「送一个值进去」 而是**送一次「完成」进去**——
  // `return()` 得让那个 `yield` 点上**跑 `finally` 链**，而那条链是**降级期**的构造
  //（`lowering.xl.md` 的 `FinallyBlocks`：每处 `return` 都是**就地发出**那几段收尾代码），
  // 引擎手里没有「这个帧欠哪些 `finally`」那张表 ⇒ 做不了。
  // **`throw()` 做得了**（在挂起点抛一个值，`Op.Resume` 那条路）——见 `DoIterNext`。
  // **`return()` 第 336 轮做掉了**（原来在这里响亮地抛，理由见 `ir.xl.md` 的
  // `CheckGeneratorReturn` 那一段）：引擎把「有人叫停」+「叫停时给的值」带到挂起点，
  // **降级层在每个 `yield` 后面问一句**、答「是」就跳到自己**已经备好的**
  // 「`return` 那一套」上（`EmitPendingFinalies` + `Op.Return`）——
  // **`finally` 那一段逻辑一个字都没有新写**，引擎也不必知道「这个帧欠哪些 `finally`」。
  //
  // **`returns = true` 那一格**：它与 `raises` **不是同一档**（`return` 只跑 `finally`、
  // `catch` 不接）——所以是**两格**而不是「抛一个哨兵」（见 `ir.xl.md`）。
  if (stepKind === 2) {
    const producedByReturn = this.NextStepOf(thisValue, sentByCaller, false, null, true);
    if (returnSlot >= 0) {
      frame.Slots[returnSlot] = producedByReturn;
    } else {
      this.Result = producedByReturn;
      this.Finished = true;
      this.Status = VmStatus.Halted;
    }
    return;
  }
  const producedByNext = this.NextStepOf(thisValue, sentByCaller, stepKind === 3, null);
  if (returnSlot >= 0) {
    frame.Slots[returnSlot] = producedByNext;
  } else {
    this.Result = producedByNext;
    this.Finished = true;
    this.Status = VmStatus.Halted;
  }
  return;
}
if (this.IsHostCallable(callee)) {
  // **执行器递出来的那两格（`resolve` / `reject`）也在这里截下来**（第 318 轮）
  // ——与生成器那三格**同一个形状**、同一条理由：它们是**语言层造的宿主引用**，
  // 而脚本是**当普通函数**调它们的（`(resolve) => resolve(1)`，**没有接收者**）
  // ⇒ 走宿主那条路时 `self` 是 `undefined` ⇒ 语言层读不到「它管的是哪个承诺」
  // ⇒ 那个承诺**永远不结清**（症状是宿主那句
  // `the script is waiting for a promise the host has not settled`——听起来像运行器卡住）。
  //
  // **「哪一个承诺」在载荷里**（`MakeSettleCallback` 把它写进 `HostRef.Opaque`）：
  // 引擎按**载荷号**认出这两格（`SettleCallbackKind`，号由语言层登记），
  // 于是**不必**把承诺绑进实参表（那要 `bind` 那一套机器），
  // 也不必要求调用方给接收者——**这正是生成器那三格已经走通的路**。
  const settleKind = this.SettleCallbackKind(callee);
  if (settleKind !== 0) {
    const payload = this.Table.Get(callee.Ref).Host;
    if (payload === null) throw new Error("a settle callback without a payload");
    const target = Value.FromObject(payload.Opaque);
    const first = count > 0 ? this.CallArgAt(frame, argBase, argArray, 0) : Value.Undefined();
    if (settleKind === 1) {
      this.ResolvePromise(target, first);
    } else {
      this.RejectPromise(target, first);
    }
    // **返回值是 `undefined`**（JS 的口径：`resolve(x)` 给 `undefined`）。
    if (returnSlot >= 0) {
      frame.Slots[returnSlot] = Value.Undefined();
    } else {
      this.Result = Value.Undefined();
      this.Finished = true;
      this.Status = VmStatus.Halted;
    }
    return;
  }
  const args: Value[] = [];
  for (let i = 0; i < count; i++) {
    args.push(this.CallArgAt(frame, argBase, argArray, i));
  }
  // **`bind` 的对象那一档例外**（第 343 轮，**实测撞到的**）：见 `IsBoundCall`
  // 那一段的账——`super(m)` 是**带接收者**的调用，而接收者正是**在造的那个实例**，
  // 给「对象自己」就把它顶掉了。**为什么不能整个去掉这条规则**：`bind` 造出来的那个
  // 对象**只有拿到自己**才读得到那三样载荷（第 228 轮的账）。
  // **只有 `bind` 那一格给自己**（**第二轮实测撞到的**）：第一版还多带了一句
  // 「调用方没给接收者时也给对象自己」 ⇒ `Error("without new")` 拿到的
  // 是**那个构造函数对象**（`self` 是对象就写它、并把它交回去）
  // ⇒ `called instanceof Error` 从**真**变成**假**（判据 29 第 4 行：
  // 「error-call-new without new」那一格——**一句话里没有一个字提到 `Error` 对象**）。
  // **其余可调用对象一律照调用方给的**：它们**一个字节都不看 `this`**
  //（第 228 轮的注释里就是这么写的），所以给 `undefined` 与给对象自己是同一件事。
  // **`bind` 那一格在 `new` 底下也要拿到自己**（第 617 轮）：
  // `IsBoundCall` 决定 `this` 从哪来 —— `bind` 造出来的那个对象**只有拿到自己**
  // 才读得到那三样载荷（第 228 轮的账），而 `super(m)` 的接收者是**在造的那个实例**、
  // 给「对象自己」就把它顶掉了 ⇒ **判据必须窄到「就是 `bind` 那一格」**。
  // **`HostConstructing` 那一半是反的**：它把「`new` 一个绑定函数」也挡掉了
  //（那一格同样要**对象自己**），而 `super` 那一档**本来就不是 `bind` 对象**
  // ⇒ 两条判据叠在一起，只误伤了前者（第 343 轮修 `super` 时漏的）。
  //
  // **实例另走一格**（`HostConstructThis`）：`self` 留给对象自己，
  // 而 `new` 底下**目标**要的是**新造的那个实例**——一个 `this` 位表达不了两件事。
  const boundCall = this.IsBoundCall(callee);
  const hostThis = boundCall ? callee : thisValue;
  const savedConstructThis = this.HostConstructThis;
  // **只在构造那一趟挂上**（构造之外它必须是「无」——与那一格同一条窗口）。
  this.HostConstructThis = boundCall && this.HostConstructing ? thisValue : Value.Undefined();
  const produced = this.CallHostValue(callee, hostThis, args);
  this.HostConstructThis = savedConstructThis;
  // **`null` 表示展开已经发生**（宿主请求了一次脚本站内异常）：**连结果都不许写**——
  // 写下去会盖掉处理点正要用的那一格（原来那版在这里 `return`，正是为了这一条）。
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
  // **「调的不是函数」要能被脚本接住**（第 153 轮），而且**只改这一处**：
  // 原来抛的是**引擎的**异常，它会冒出 `Run()`——于是
  // `try { o.m() } catch {}` 进不去 `catch`（JS 是 `TypeError`，**可接住**）。
  // 走 `Guard` 那条路，与第 127 / 136 轮的「属性读空值」是**同一条**处置。
  //
  // **不能改成「把整条调用包进 Guard」**（第一版就是这么写的，判据当场红了三条）：
  // 那样连**构造函数 / 宿主函数**里抛的错也一起变成脚本异常——
  // 而「引擎内部的失败照样冒出」是**故意**的（第 121 轮那条兜底判据钉着它）。
  // 所以包的是**这一句诊断**，不是那一段调用。
  //
  // **第 153 轮第二次试的结果**：这一处（`Op.Call` 那条路）**改回来了**——
  // 它一改，`new` 那一族的判据当场红了（「没接上原型名字时要报出来」）。
  // 那一档的重点是**引擎内部的失败照样冒出**（第 121 轮那条兜底判据钉着它），
  // 而这一条诊断恰好也在那条路上。**所以只改下面那条 `Op.CallMethod`**——
  // 判据钉的那几处都不是方法调用，而 `o.m?.()` 那一族正是。
  //
  // **第 246 轮：两处都量清了，一起改**（第 245 轮只改了这半边、另一半漏了）。
  // **两个入口**：这一处（`DoCallValue`）管 `Op.CallMethod` / `o?.m()` 那一族，
  // `CallNative` 那一处管 `Op.Call`（`f(...)` 与 `(1 as any)()`）——
  // **只改一处的话**，同一个脚本里两条路的 `catch` 行为不同，而那**不报错**
  //（与第 228 轮 `sort` 那条「一个数扛两种含义」同一类坑）。
  //
  // **收尾按这一处自己的签名**（**先把签名抄在手边再落笔**，第 245 轮两次都看反了）：
  // `## method DoCallValue:(…)=>void` ⇒ **裸 `return`**；
  // 而 `CallNative:(…)=>Value` ⇒ 那一处交 `Value.Undefined()`。
  // **两处抄反就是两条编译期错各说各的反话**
  //（一处 `Type 'Value' is not assignable to type 'void'`、
  //  另一处 `Type 'undefined' is not assignable to type 'Value'`）。
  // **控制流已经交出去了**：`Guard` 里那一抛把帧退到处理点、或者把状态置成 `Threw`
  //——所以这一句 `return` 之后**没有一行会被跑到**（也不必假装有个值）。
  this.Guard(() => {
    throw new TypeError("cannot call a non-closure value (it is not a function)");
  }, ErrorKindType);
  return;
}
const closure = this.Table.Get(callee.Ref).AsClosure();
const info = FunctionAtEntry(this.Code(), closure.Code);
if (info === null) {
  throw new Error("closure points at no function: " + closure.Code);
}
// **生成器函数不在这里跑**：调用它只造一个生成器对象（帧开好但不上栈）。
if (info.IsGenerator) {
  // **剩余参数要在开帧时收掉**（第 133 轮）：多出来的那些实参**在自己的帧里没有格子**
  //（`SlotCount` 定死、调用方传几个编译期不知道），所以**开帧的人顺手收**。
  const restCount = this.RestCountOf(info, count);
  const argsCount = this.ArgumentsCountOf(info, count);
  if (!this.NeedRoom(ObjectCharge * 2 + info.SlotCount * ValueCharge
      + (restCount > 0 ? ObjectCharge + ValueCharge * restCount : 0)
      + (argsCount > 0 ? ObjectCharge + ValueCharge * argsCount : 0))) return;
  const createdHandle = this.Table.CreateFrame(closure.Code, info.SlotCount, 0, -1);
  const created = this.Table.Get(createdHandle).AsFrame();
  created.Pc = closure.Code;
  created.Env = closure.Env;
  created.This = thisValue;
  this.FillParameters(created, info, frame, callee, argBase, argArray, count);
  const generatorHandle = this.Table.CreateGenerator(createdHandle);
  created.Generator = generatorHandle;
  // **生成器对象要带上那一格原型**（第 229 轮）：见 `AttachGeneratorProto`。
  this.AttachGeneratorProto(generatorHandle, info.IsAsync);
  if (returnSlot >= 0) frame.Slots[returnSlot] = Value.FromObject(generatorHandle);
  return;
}
const restCount = this.RestCountOf(info, count);
const argsCount = this.ArgumentsCountOf(info, count);
if (!this.NeedRoom(ObjectCharge + info.SlotCount * ValueCharge
    + (restCount > 0 ? ObjectCharge + ValueCharge * restCount : 0)
    + (argsCount > 0 ? ObjectCharge + ValueCharge * argsCount : 0))) return;
// **`async` 函数先把承诺交给调用者，再跑体**（第 285 轮）。
//
// 这是第 229 轮量出来、留了一整轮的那条语义差：JS 里 `f()` 拿到的是
// **一个承诺**，调用者**不等**它（体跑到第一个 `await` 就还回去）。
// 本仓的 `await` 挂的是**当前帧**——所以只要还照「帧压在调用者上面」开，
// `f()` 就会把调用者一起停住，调用者拿到的是 `undefined`（那不是承诺）。
//
// **修法是三句话**：
//   ① 承诺**在开帧那一刻就造好**、当场写进调用者指定的那一格
//      （于是 `f()` 这个表达式的值就是承诺，一格都不用等）；
//   ② 帧的 `ReturnSlot` 给 **`-1`** ——**它没有调用者**：
//      `return v` 的意思是「承诺兑现为 `v`」（`DoReturn` 认 `AsyncPromise`），
//      而**那个承诺早就交出去了**，用不着再写回谁的一格；
//   ③ `AsyncPromise` 从开帧起就是那个承诺 ——这样「这是不是 async 帧」
//      在**收尾那一刻**也回答得出来（`throw` 那条路要把它变成**拒绝**，
//      而 `await` 过的帧**不在栈上**，那时更没法反查调用者）。
//
// **体照常压帧跑**（**同步跑到第一个 `await`**，与 V8 一字不差）：
// `await` 那一刻帧被摘下来，`DoAwait` 把「在等谁」记进 `Awaiting`。
//
// **只做一半就是「响亮地抛」换成「静默 `undefined`」**（第 229 轮的红就是这么来的）——
// 所以 `return` 与 `throw` 两条收尾路**一起**改。
//
// **`room` 要一次问够**：承诺 + 帧 + 槽 + 剩余参数数组（帧那一格自己也要）——
// 少问一格时 `NeedRoom` 会在**分配中途**才说不，而那时承诺已经造出来了
// （那一格就是**泄漏**：没人拿得到它）。
//
// **`NeedRoom` 失败时不许写调用者那一格**（状态已经是 `OutOfMemory`、
// 循环立刻退出；写进去的是一个「永远不结清的承诺」，比停下更坏）。
if (info.IsAsync) {
  if (!this.NeedRoom(ObjectCharge * 2 + info.SlotCount * ValueCharge
      + ValueCharge + (restCount > 0 ? ObjectCharge + ValueCharge * restCount : 0))) return;
  // **承诺走 `MakeAsyncPromise`**（不是裸的 `CreatePromise`）：脚本对 `f()` 的
  // 第一件事几乎总是 `.then(…)`，而那三个方法是**挂上去的属性**——
  // 裸承诺上没有它们（症状见 `MakeAsyncPromise` 那一段）。
  const asyncHandle = this.Frames.Push(closure.Code, info.SlotCount, -1);
  const asyncFrame = this.Table.Get(asyncHandle).AsFrame();
  asyncFrame.Env = closure.Env;
  asyncFrame.This = thisValue;
  // **`new.target` 要的是「哪一个构造函数」**（第 346 轮）——
  // 与 `ConstructTarget`（那是**实例**的句柄，`DoReturn` 用它）**不是一回事**，
  // 所以另开一格存**被调的那个值**（宿主引用 / 闭包 / 可调用对象 都行）。
  // **不是构造调用时给 `undefined`**（JS 的 `F()` 里 `new.target` 就是 `undefined`，
  // 判据 `c304-rt-new-target-in-ctor` 第 1 行钉着它）。
  asyncFrame.ConstructTarget = constructTarget;
  asyncFrame.NewTarget = constructTarget > 0 ? callee : Value.Undefined();
  // **先把实参抄进新帧，再把承诺写回调用者那一格**（第 286 轮实测**逼出来**的）。
  //
  // **反过来的那份顺序是错的**（第一版就是先写承诺）：这里「写回哪一格」
  // 与「实参放在哪」**是同一格**——调用约定说结果落在**参数基址**上
  //（`ir.xl.md`：`call` 的 `B` 既是参数基址、又是返回格）。
  // 于是先写承诺就等于**把第一个实参盖掉**：
  // `async function f(n) {}` 里 `n` 收到的是**那个承诺**
  //（实测现象：`console.log("f got", n)` 打出 `{ then: …, catch: …, finally: … }`，
  // 而 `n * 2` 报「cannot convert object to a primitive value」——
  // **一句话里没有一个字提到参数**，离现场很远）。
  // **无参的 async 函数照旧是对的**（没有实参可盖）——所以这个缺口
  // 只在「带参数的 async 函数」上现形（那是最普通的一种）。
  this.FillParameters(asyncFrame, info, frame, callee, argBase, argArray, count);
  const asyncPromise = this.MakeAsyncPromise(PromiseState.Pending, Value.Undefined());
  if (returnSlot >= 0) frame.Slots[returnSlot] = asyncPromise;
  asyncFrame.AsyncPromise = asyncPromise.Ref;
  return;
}
const handle = this.Frames.Push(closure.Code, info.SlotCount, returnSlot);
const created = this.Table.Get(handle).AsFrame();
created.Env = closure.Env;
created.This = thisValue;
// **`new.target` 要的是「哪一个构造函数」**（第 346 轮）——
// 与 `ConstructTarget`（那是**实例**的句柄，`DoReturn` 用它）**不是一回事**，
// 所以另开一格存**被调的那个值**（宿主引用 / 闭包 / 可调用对象 都行）。
// **不是构造调用时给 `undefined`**（JS 的 `F()` 里 `new.target` 就是 `undefined`，
// 判据 `c304-rt-new-target-in-ctor` 第 1 行钉着它）。
created.ConstructTarget = constructTarget;
created.NewTarget = constructTarget > 0 ? callee : Value.Undefined();
this.FillParameters(created, info, frame, callee, argBase, argArray, count);
```

## method ThrownTaker:()=>ThrownTaker

**把这台机器包成「上一次同步调用抛了吗」的回调**（第 285 轮）——
与 `Invoker()` / `Scheduler()` 同一条理由（语言层不该认识 `Vm`）。

**为什么它不是 `TakeThrown` 本身**：那个是**方法**（要用 `this`），
而语言层拿到手的必须是一个**不带接收者也能调**的函数——
方法引用会丢 `this`（第 185 轮实测过），**所以照旧包一层箭头函数**。

```ts
return (): Value => this.TakeThrown();
```

## method Invoker:()=>InvokeCallback

**把这台机器包成「同步调一个脚本值」的回调**（第 285 轮）——
与 `Native()` / `Scheduler()` 同一条理由（语言层不该认识 `Vm`），
**也同样是包一层箭头函数**（方法引用会丢 `this`，第 185 轮实测过）。

```ts
return (callee: Value, self: Value, args: Value[]): Value => {
  // **接收者由调用方给**（第 286 轮）：`new Promise(执行器)` 那一格把
  // **那个承诺**递进来——脚本里写的是 `(resolve) => resolve(1)`，
  // 那个 `resolve` 是**当普通函数**调的（没有接收者），
  // 而「它管哪一个承诺」藏在**它自己的宿主引用**里（`MakeSettleCallback` 的 `Opaque`）。
  // **所以这里不许自己猜一个**——`callee` 是宿主引用时它
  // **身上没有那一格**（`String(x)` / `Array(n)` 那几格都不看 `this`，
  // 可 `resolve` 恰恰**全靠 `this`**）。
  //
  // **少了它会怎样**：宿主拿到 `self = undefined`，`SettleOfCallback`
  // 读 `self.Tag` 报 `Cannot read properties of undefined (reading 'Tag')`
  //（**一句话里没有一个字提到承诺**），而那一抛被引擎抬成脚本异常 ⇒
  // 这个承诺被**拒绝** ⇒ 宿主 `Classify` 说「脚本挂着等一个它没结清的承诺」——
  // **看起来像运行器卡住了**，真相是**接收者传丢了**。
  return this.CallNative(callee, self, args);
};
```

## method TakeThrown:()=>Value

**「上一次同步调用是不是抛了；抛的是什么」**（第 285 轮）——
取走并**把状态放回去**（与 `TakeRaise` 那条「取走即清空」同一条纪律）。

**为什么必须有它**：`new Promise((r) => { throw new Error("boom") })` 里那一抛
在 JS 里**不是**宿主错误——它是**结果承诺被拒绝**（`p.catch(e => …)` 接得住）。
可那一抛在本仓里是「宿主异常从 `CallNative` 里冒出来、把状态置成 `Threw`」——
建库层要接住它，就得有一句话问得出「刚才是抛了吗、抛的是什么」。

**非 `Threw` 一律给 `undefined`**（**不是**「返回 `null` 表示没有」）：
调用点几乎都是 `if (thrown.Tag !== ValueTag.Undefined)` 这一形状
（见 `promise.xl.md` 的 `PromiseCtor`）——多一种哨兵就多一处判据。

**状态要放回去**（与 `RunNativeTask` 那一处一字不差）：`DoThrow` 把它置成
`Threw` 了，而这一趟**脚本还要接着跑**（那个 `catch` 就挂在后面）——
不放回去，外层那一段**悄悄停下**（而且不报错）。

**放回哪一档不能只看 `Finished`**（第 331 轮改）——**这一条是实测逼出来的**。
原来的判据是 `Finished ? Halted : Ready`，它在**入口那一趟**是对的
（`Finished` 为假 ⇒ 脚本还在跑 ⇒ `Ready`）；可**微任务那一趟**里
`Finished` **已经是真**（入口函数早返回了），而这一趟**仍然有一帧在跑**——
`DrainMicrotasks` 是拿 `RunToDepth(0)` 跑的，它把挂起的帧 `PushBack` 回来接着跑。
置成 `Halted` ⇒ **那个分派循环立刻停** ⇒ 那一帧**停在半句话上**，
而 `DrainMicrotasks` 只判「`Ready` 或 `Halted` 都算正常」 ⇒ **一声不响地跳到下一个微任务**。

**现场**（d2 那条探针）：

    async function main() {
      await null;                                   // ← 这一帧是微任务里推回来的
      const p = new Promise(() => { throw new Error("e"); });   // ← 执行器那一抛
      console.log("m2b");                           // ← 这一行永远不执行
    }

Node 印 `m2b`，本仓**一行都不印**（退出码还是 0）。
**判据换成「帧栈空不空」**：还有帧要跑 ⇒ `Ready`；真的空了 ⇒ `Halted`。
**它在原来那几档上给的是同一个答案**（入口那一趟 `Finished` 为假时栈里一定有帧、
执行器在顶层抛时栈里是 `[模块帧]`）——所以这一改**只动了那一个原本错的格子**。

```ts
if (this.Status !== VmStatus.Threw) return Value.Undefined();
const value = this.Pending;
this.Pending = new Value();
this.Status = this.Frames.IsEmpty() ? VmStatus.Halted : VmStatus.Ready;
return value;
```

## method IsHostCallable:(value:Value)=>bool

**这个值能不能被调用**——`HostRef` 与**带可调用载荷的对象**都算（第 145 轮）。

**为什么收成一个方法**：这个判据在**三处**要用（`DoCallValue` 的调用路、
`DoNew` 的构造路、`CallNative` 的重入路——`[1, 2].map(String)` 走的就是第三条）。
写三遍就是三处会走偏——而走偏的症状是「有一处能调、另一处报 `calling a non-closure value`」
（那种消息听起来像脚本写错了）。

**对象那一半要看堆**：`Tag` 是 `Object` 的还有帧 / 环境 / 生成器 / 迭代游标那些
**引擎内部对象**，它们没有载荷（`Host` 是 `null`）——所以这一条判据必须
**真的去读那一格**，不能只看标签。

```ts
if (value.Tag === ValueTag.HostRef) return true;
if (value.Tag === ValueTag.Object) return this.Table.Get(value.Ref).Host !== null;
return false;
```

## method CallHostValue:(callee:Value, thisValue:Value, args:Array<Value>)=>Value | null

**调一次宿主可调用值**（第 145 轮从 `DoCallValue` 里抽出来）——宿主函数与
可调用对象**共用这一份**（`DoCallValue` 的调用路、`CallNative` 的重入路）。

**返回 `null` 的意思是「展开已经发生」**：宿主请求了一次脚本站内异常
（`RaiseRequest` / `Raise` 那一段）——`DoThrow` 已经把控制流交给处理点了，
所以调用方**必须立刻返回**，连结果都不许往槽里写（那一格可能是处理点要用的）。
**这条「要不要写结果」原来靠调用方自己 `return`**；抽出来之后它变成**返回值的一半语义**，
所以类型写成 `Value | null`——让「可能没有结果」这件事在签名上就看得见。

```ts
const invoker = this.Host;
if (invoker === null) throw new Error("calling a host function with no host installed");
// **第五格是「`new` 底下新造的那个实例」**（第 617 轮）：`bind` 那一格要
// **对象自己**才读得到三样载荷（`self`），而 `new` 底下**目标**要的是实例——
// 一个参数表达不了两件事，所以实例单独走一格（见 `HostConstructThis`）。
// **非构造那一趟它是 `undefined`**（与 `HostConstructing` 同一条口径）。
const produced = invoker(callee, thisValue, args, this.Room(), this.HostConstructThis);
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

- `argArray < 0`：普通调用，就是 `argc`（调用方写死的那个数）；
- 否则：**那一格里的数组有多长就是几个**。

**不是数组就抛**：`call_array` 的 `B` 由降级层填，填错就是**降级层的 bug**——
而**验证层查不出这一条**（动态 IL 证明不了类型），所以在这里响亮地报。

```ts
if (argArray < 0) return argc;
const items = frame.Slots[argArray];
if (items.Tag !== ValueTag.Array) {
  throw new Error("call_array needs an array of arguments");
}
return this.Table.Get(items.Ref).AsArray().GetLength();
```

## method CallArgAt:(frame:HeapFrame, argBase:int, argArray:int, index:int)=>Value

**第 `index` 个实参**（`CallArgCount` 的配套）。两个取参数的地方共用它。

```ts
if (argArray < 0) return frame.Slots[argBase + index];
return this.Table.Get(frame.Slots[argArray].Ref).AsArray().GetAt(index);
```

## method FillParameters:(created:HeapFrame, info:FunctionInfo, frame:HeapFrame, callee:Value, argBase:int, argArray:int, count:int)=>void

**把实参铺进新帧**（第 133 轮从 `DoCallValue` 里抽出来）——普通与生成器两条路共用。

**两处规矩**：

1. **拷多少要夹住**（这一轮顺带修的）：`SlotCount` 是**被调方**定的，
   而调用方传几个它管不着。原来这里是 `for (i < argc) created.Slots[i] = …`——
   `argc` 比 `SlotCount` 大时**写到帧尾之外**：TS 那边 `Array` 会**悄悄变长**，
   C++ 那边就是越界写（**同一个 IR 在两个目标上是两种命运**）。
   夹到 `SlotCount` 之后，多出来的实参**看不见**——而 **JS 本来也看不见它们**
   （除了 `arguments` 与剩余参数，两条都在别处）。
2. **剩余参数收在最后一格**：`[fixed, count)` 那些实参造一个数组，
   放进第 `fixed` 格（`fixed = ParamCount - 1`）。**数组要带数组原型**
   （否则它连 `.join` 都没有——与 `Object.keys` 那条是同一条规矩）。

**为什么 `RestCountOf` 与这里都要算一遍**：`NeedRoom` 必须在**开帧之前**问
（`README` 的硬性约定：不许「先开帧再问」），所以调用方先算一次；
这里再算一次是因为**铺参数要那个数**。两处用的是**同一个函数**，不会走偏。

```ts
const fixed = info.HasRest ? info.ParamCount - 1 : info.ParamCount;
// **拷的个数要按「实际传了几个」夹**（`count`），**不是按 `SlotCount`**——
// 这一格是**这一轮实测踩出来的**：写成 `min(fixed, SlotCount)` 时，
// `function f(a = 1, b = a + 10)` 的 `f(2)` 会把**调用方第 1 格之后的垃圾**抄进 `b`
//（症状：`b` 不再是 `undefined`，默认值判定成「传了」，`f(2)` 给 200 而不是 212）。
// 原来那句 `for (i < argc)` 恰好是对的——把它改成「扫满形参」是**往错的方向走**，
// 而**旧判据当场就把这一格点出来了**（第 119 轮那条默认参数判据）。
const limit = count < fixed ? count : fixed;
// 没有剩余参数时，**多传的**那些也要拷（它们落在形参之后的格上），但同样不能越过 `count`，
// 也不能越过帧尾（`SlotCount` 是被调方定的）。
const total = count < info.SlotCount ? count : info.SlotCount;
for (let i = 0; i < limit; i++) {
  created.Slots[i] = this.CallArgAt(frame, argBase, argArray, i);
}
if (!info.HasRest) {
  for (let i = fixed; i < total; i++) {
    created.Slots[i] = this.CallArgAt(frame, argBase, argArray, i);
  }
} else {
  const restCount = this.RestCountOf(info, count);
  const restHandle = this.Table.CreateArray();
  if (this.Protos !== null) this.Table.Get(restHandle).Proto = this.Protos.Array;
  for (let i = 0; i < restCount; i++) {
    // **每一趟现取视图**（`heap.xl.md` 那条：句柄稳定、视图不稳定）。
    this.Table.Get(restHandle).AsArray().Push(this.CallArgAt(frame, argBase, argArray, fixed + i));
  }
  if (fixed < info.SlotCount) created.Slots[fixed] = Value.FromArray(restHandle);
}
// **`arguments` 收在形参之后那一格**（第 332 轮）——**与剩余参数同一个位置、同一条理由**：
// 多出来的实参在**被调方自己的帧里没有格子**（`SlotCount` 定死），
// 所以**开帧的人顺手收**。次序是语义：它必须排在**铺实参那两趟之后**——
// 上面那个 `for (i = fixed; i < total)` 会把实参写进**形参之后的格**，
// 而 `arguments` 那一格正是 `ParamCount` ⇒ 先收就会被**覆盖掉**（**静默错值**）。
//
// **它必须在「有没有剩余参数」那两条路之外**（第 332 轮，**第一版就是放在里面**）：
// 那一支原先写成「没有剩余参数 ⇒ 铺完就 `return`」 ⇒ 这一整段**只对带 `...rest` 的函数生效**
// ——症状是 `function f(a, b) { arguments.length }` 读出来是 `undefined`
//（而 `function f(a, ...r)` 那一格反而是好的，**同一句话两种结局**）。
// **收的是全部 `count` 项**（不是「多出来的」）：`arguments[0]` 必须是第一个形参。
// **数组带数组原型**（与剩余参数那条一字不差，理由见上）。
// **第 702 轮起还要挂一格标记与 `callee`**：`arguments` 在本仓的**值是数组**
// （上面那两条：带数组原型、`arguments[0]` 读得到），可 JS 的 `arguments` **不是数组**——
// `Array.isArray(arguments)` 是**假**、`Object.prototype.toString.call(arguments)`
// 是 `"[object Arguments]"`、`Object.getOwnPropertyNames(arguments)` 里还有 `callee`。
// **为什么不改值模型**（把 `arguments` 造成另一种 `ValueTag`）：那会牵动
// `arguments[0]` / `arguments.length` / `[...arguments]` 这一整片**本来已经对**的东西——
// 而它现在对，正是因为它就是个数组。
// **所以只在它身上记一格**（键名与 `__t` / `__k` / `__v` 同一族）：**谁是谁**由语言层
// 那几个判据去读（`DateMarker` / `ArrayIsArray` / `ObjectTagOf`），引擎不认识
// `"Arguments"` 这个标签、也不认识 `callee` 这几个字母，它只负责把标记挂上。
// **`callee` 就是「这一次被调的那个值」**——调用点手上就有它（`DoCallValue` 的 `callee`），
// 所以它从形参进来。**不要从 `frame.NewTarget` 上读**（第 702 轮第一版就是那么写的）：
// `frame` 是**调用者的帧**，不是这一帧的 —— `arguments.callee` 于是恒为 `undefined`
//（顶层帧的 `NewTarget` 永远是空的），而症状只是「`typeof` 给 `"undefined"`」，
// 离现场很远。**`new f()` 那一档照样给那个值**：JS 里构造调用的 `arguments.callee`
// 也是函数自己（严格模式下才没有这一格，而本仓只做松散模式那一档）。
if (info.NeedsArguments && info.ParamCount >= 0 && info.ParamCount < info.SlotCount) {
  const argCount = this.ArgumentsCountOf(info, count);
  const argsHandle = this.Table.CreateArray();
  if (this.Protos !== null) this.Table.Get(argsHandle).Proto = this.Protos.Array;
  for (let i = 0; i < argCount; i++) {
    this.Table.Get(argsHandle).AsArray().Push(this.CallArgAt(frame, argBase, argArray, i));
  }
  const argValue = Value.FromArray(argsHandle);
  // **两格都不可枚举**：`Object.keys(arguments)` 在 JS 里是 `["0","1",…]`
  //（只有下标那几格可枚举），`callee` 与标记**一个都不该出现**。
  // **键名的码元走 `HostTextUnits`**（与下面 `MakeIterResult` 那一处一字不差）：
  // 引擎里「字符串 → 码元」**只有那一处借用**，`tests/runtime/check.mjs` 有一道门
  // 逐文件扫 `charCodeAt`——第一版在这里手写了个小循环，当场被那道门抓住。
  SetHiddenProperty(this.Room(), this.Table, argValue,
    Value.FromString(this.Table.CreateString(HostTextUnits("__a"))), Value.FromInt(argCount));
  SetHiddenProperty(this.Room(), this.Table, argValue,
    Value.FromString(this.Table.CreateString(HostTextUnits("callee"))), callee);
  created.Slots[info.ParamCount] = argValue;
}
```

## method DoCallArray:(frame:HeapFrame, instr:Instruction)=>void

**`call_array` 的执行**（第 133 轮）：`A` 被调方、`B` 装着实参的数组、`C` 结果格、
`D` 的 `this`（`-1` 给 `undefined`）。

**它就是 `call` 加一个「参数从数组来」**——三条分支（宿主 / 生成器 / 闭包）
**一个字都没有另写**：全部落在 `DoCallValue` 里，这里的 `argArray` 只是换了个来源。

**为什么结果写在 `C` 上、不在「参数基址」上**：这里**没有参数基址**这回事
（参数在堆里那个数组上）。所以调用约定那一条（结果落回基址）在这条路上**不适用**，
写清楚免得后人以为是漏了。

```ts
const self = instr.D >= 0 ? frame.Slots[instr.D] : Value.Undefined();
this.DoCallValue(frame, frame.Slots[instr.A], 0, 0, instr.C, self, 0, instr.B);
```

## method RestCountOf:(info:FunctionInfo, count:int)=>int

**剩余参数要收几个**（第 133 轮）。

**两处用它**（`NeedRoom` 那一问与 `FillParameters` 那一铺）——**同一个数只算一处**。

```ts
if (!info.HasRest) return 0;
const fixed = info.ParamCount - 1;
if (fixed < 0) return 0;
if (count <= fixed) return 0;
return count - fixed;
```

## method ReentryArgumentsCharge:(info:FunctionInfo, args:Array<Value>)=>int

**重入那条路上 `arguments` 与剩余参数要问多少房间**（第 332 / 598 轮）——不用就返回 `0`。

**为什么重入要单独一份**：`DoCallValue` 那一条走的是 `FillParameters`
（它手上有调用者的帧与实参窗口）；而**重入**（`CallNative`：内建回调、
访问器、微任务里的回调）手上是**一个宿主数组**——两条路的实参来源不同，
所以「要不要收」这一句判据要**共用**（本方法与 `FillReentryArguments` 都只看
`info.NeedsArguments` / `info.HasRest`），别的一处不写第二遍。

**剩余参数那一格也要算**（第 598 轮）：`f.call(o, 1, 2)` 走的正是重入，
而 `function f(...rest)` 那个数组**也是这一层造的**——漏算就是「分配刚好越界」
（与 `bind` 那一处估少了五个属性同一条纪律）。

```ts
let charge = 0;
if (info.NeedsArguments && info.ParamCount >= 0 && info.ParamCount < info.SlotCount) {
  charge = charge + ObjectCharge + ValueCharge * args.length;
}
if (info.HasRest && info.ParamCount > 0 && info.ParamCount - 1 < info.SlotCount) {
  const fixedRest = info.ParamCount - 1;
  const restCount = args.length > fixedRest ? args.length - fixedRest : 0;
  charge = charge + ObjectCharge + ValueCharge * restCount;
}
return charge;
```

## method FillReentryArguments:(created:HeapFrame, info:FunctionInfo, args:Array<Value>)=>void

**重入那条路上把 `arguments` 与剩余参数收进各自那一格**（第 332 / 598 轮）。

**它补的是一个实测到的洞**：`queueMicrotask(function () { arguments.length })` 里那个
`arguments` 是 `undefined`——**回调里抛出来的那一抛又正好被承诺吞掉**
（`queueMicrotask` 的回调抛了会变成「没人看的承诺被拒绝」，一句异常都不打印），
所以症状是**那一行根本不印**。**同一个洞早就在那儿**：`xs.forEach(function (x) { … })`
里的 `arguments` 一直是空的（第 133 轮那条注释里写着「这一条路不收剩余参数」，
只是那时没人量到 `arguments` 也是同一格）。
**判据、位置、格子与 `FillParameters` 那条一字不差**（都是 `info.ParamCount`）。

**剩余参数那一格原来被「按格数铺」写坏了**（第 598 轮）：`CallNative` 有一句
`for (i < args.length && i < SlotCount) frame.Slots[i] = args[i]`（`FillParameters`
没有这一句，它按 `fixed` 分两趟铺）⇒ `function f(...rest)` 从重入被调时
**第 `fixed` 格装的是第一个实参**（一个数字），而不是那个数组——
症状离现场很远：`f.call(o, 1, 2)` 报 `cannot call a non-closure value`
（`rest.join` 是在一个数字上读 `.join`），判据 `c371-rt-bind-call-apply-forms`。
所以这里要把那一格**按数组重写一遍**（次序与 `FillParameters` 一致：
剩余参数在前、`arguments` 在后——后者的位置 `ParamCount` 更大）。

```ts
if (info.HasRest) {
  const fixed = info.ParamCount - 1;
  if (fixed >= 0 && fixed < info.SlotCount) {
    const restHandle = this.Table.CreateArray();
    if (this.Protos !== null) this.Table.Get(restHandle).Proto = this.Protos.Array;
    for (let i = fixed; i < args.length; i++) {
      // **每一趟现取视图**（`heap.xl.md` 那条）。
      this.Table.Get(restHandle).AsArray().Push(args[i]);
    }
    created.Slots[fixed] = Value.FromArray(restHandle);
  }
}
if (!info.NeedsArguments) return;
if (info.ParamCount < 0 || info.ParamCount >= info.SlotCount) return;
const handle = this.Table.CreateArray();
if (this.Protos !== null) this.Table.Get(handle).Proto = this.Protos.Array;
for (let i = 0; i < args.length; i++) {
  // **每一趟现取视图**（`heap.xl.md` 那条）。
  this.Table.Get(handle).AsArray().Push(args[i]);
}
created.Slots[info.ParamCount] = Value.FromArray(handle);
```

## method ArgumentsCountOf:(info:FunctionInfo, count:int)=>int

**这个 `arguments` 要装几项**（第 332 轮）——**全部实参**（不是「多出来的」）。

**与 `RestCountOf` 是同一个形状、同一个用法**（`NeedRoom` 那一问与 `FillParameters` 那一铺）：
两处都用它 ⇒ **同一个数只算一处**。

**它收的是 `count`**：`arguments` 里**前几个也在**（`f(1,2)` 的 `arguments` 是 `[1, 2]`、
不是 `[]`）——这正是它与剩余参数的分界。

```ts
if (!info.NeedsArguments) return 0;
if (info.ParamCount < 0) return 0;
if (info.ParamCount >= info.SlotCount) return 0;
return count;
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
this.AttachGeneratorProto(generatorHandle, info.IsAsync);
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
// **这一次属性读也要带类别**（第 254 轮）——**第三个入口**：
// 第 246 轮补的是「调一个不是函数的东西」那两处（`CallNative` 与 `DoCallValue`），
// 而这一处（`DoCallMethod` 里那一次 `GetProperty`）**漏了**。
//
// **漏了的症状很贵**：接收者是 `undefined` 时 `GetProperty` 会抛，
// 而那一抛**不过 `Guard`** ⇒ **从来没被翻成脚本异常** ⇒
// 它一路冒出 `Run()`、最后由**命令行那个顶层 `catch`** 接住——
// 读到的是一句 `cannot read properties of undefined` 加**十帧引擎栈**
//（第 252 轮就是这么拿到那份栈的），而**脚本的 `try` 一句都接不住**。
// **包上之后它就变成脚本接得住的 `TypeError`**——
// 而那个 `undefined` **从哪里来**才变成一件可读的事
//（第 253 轮缩出来的那个十一行现场：`.then` 回调里一个被内层闭包捕获的 `const`）。
//
// **形状与那两处一字不差**（`Guard` + `ErrorKindType`）——
// 引擎**仍然不认识** `"TypeError"` 这几个字母，它只把**类别**交给错误工厂。
// **这一次读的结果**要留成一格（下面调它时要用），所以不能像那两处一样直接 `return`。
// **符号上那一格先问一句**（第 277 轮）：`a.toString()` 走的是**这一处直呼 `GetProperty`**，
// 不是 `RtOp.GetProp`——两处各写一份判据就是两处会漂的答案
//（判据集中在 `SymbolMethodOf`，那里写着为什么）。
// **不是符号上的那一格时它给 `undefined`**，于是下面那一句照旧（一个字都没变）。
const symbolCallee = this.SymbolMethodOf(receiver, key);
if (symbolCallee.Tag !== ValueTag.Undefined) {
  this.DoCallValue(frame, symbolCallee, instr.C, instr.D, instr.C, receiver, 0);
  return;
}
// **这一次读之后，帧还在不在原处**（第 772 轮，**实测撞到的**）：`Guard` 把那一抛翻成
// 脚本站内异常之后**控制流已经交给处理点**（`DoThrow` 退帧 / 改 `Pc`），可**这一句之后照旧会跑**——
// 于是底下那次 `DoCallValue` 拿到的是 `Value.Undefined()` ⇒ 它再抛一次
// `cannot call a non-closure value`，而**处理点已经被上一次展开取走了**
// ⇒ 这一抛**没有落点**、整份脚本被引擎带走（退出码 1、`catch` 里一个字都没打）。
//
// **两个症状，同一个根**（都由这一轮的普查量到）：
//   ① `const u: any = undefined; try { u.x(); } catch {}`——`u.x` 那一读**抛得出来**
//      （`RtOp.GetProp` 那条路是好的），可紧接着那次调用落在脚本的 `try` **外面**
//      （第 771 轮登记的 `runtime/round771/r771c-01` 正是这个形状）；
//   ② **调用位上的 getter 抛错**：`const o = { get g() { throw new TypeError("boom") } }; o.g()`
//      同样被带走——`GetProperty` 自己会去调那个 getter，那一抛走的是**重入**那条路，
//      于是**连 `Guard` 都没经过**（它不在这一句的 JS 调用栈里）。
//
// **判据为什么是三样合起来**（`readThrew` / `Pc` / 层深），一样都不能省：
//   · **`readThrew`** 管①：那一抛是 `GetProperty` **自己抛出来的宿主异常**，
//     就地记一格最准（`Guard` 接住它之前只有这里看得见）；
//   · **`Pc`** 管②里「处理点还在这一帧」那一半：`DoThrow` 的落点若在**本帧**，
//     它改的是 `frame.Pc`（主循环进每条指令前先 `frame.Pc = pc + 1`，
//     所以这一格在这一次读里**只可能被落点改**）；
//   · **层深**管②里「处理点在本帧**外面**」那一半：那时本帧被弹掉、`Pc` 留在原处，
//     说的出话的只剩层深（**不能拿 `Frames.Current()` 顶替**——空栈时它要抛）。
//
// **为什么不能只看 `this.Throws` 变没变**（那条惯用法在 `CallNative` 里是对的）：
// `Throws` 是**展开次数**——getter **自己接住**了它里面那一抛时它照样加一，
// 而那一刻 `GetProperty` 是**正常返回**的 ⇒ 拿它当判据会把一次正常的调用整段跳掉
// （**静默错值**，比原来那个响亮地崩更难查）。上面这三样都不会被「里面接住了」骗到：
// 接住之后本帧的 `Pc` 与层深都回到原样。
const pcBeforeRead = frame.Pc;
const depthBeforeRead = this.Frames.Depth();
let readThrew = false;
const callee = this.Guard(() => {
  try {
    return GetProperty(this.Room(), this.Native(), this.Protos!, this.Table, receiver, key);
  } catch (error) {
    readThrew = true;
    throw error;
  }
}, ErrorKindType);
// **控制流已经交出去了**：这一句之后没有一行会被跑到（与 `DoCallValue` 那两处同一条约定）。
if (readThrew || frame.Pc !== pcBeforeRead || this.Frames.Depth() !== depthBeforeRead) return;
this.DoCallValue(frame, callee, instr.C, instr.D, instr.C, receiver, 0);
```

## method SymbolMethodOf:(receiver:Value, key:Value)=>Value

**符号上那一格要**调**的东西**（第 277 轮）——`Op.CallMethod` 那条路要的正是它。
不是符号上的那一格就给 `undefined`（调用方接着走原来的路）。

**为什么它必须单独存在**：属性读有**两条**路——
`RtOp.GetProp`（`a.toString` 这一种**取值**）与**这一处直呼 `GetProperty`**
（`a.toString()` 这一种**调用**，第 1452 行）。
**两处各写一份判据就是两处会漂的答案**，而漂了的表现是
「`a.toString` 拿得到、`a.toString()` 拿不到」——**一半对一半错**，
正是第 277 轮实测踩到的那个形状（`description` 那一格只用「取值」那条路，
所以它没暴露这件事）。

**`0` 的两个都要判**（键没给、号没给）：只判一个会交出一个 `HostRef(0)`，
而那不是个东西（症状是「调用一个非闭包」，离真相很远）。

```ts
if (receiver.Tag !== ValueTag.Symbol) return Value.Undefined();
if (this.ToStringKey <= 0 || this.SymbolToStringId <= 0) return Value.Undefined();
if (key.Tag !== ValueTag.String) return Value.Undefined();
if (!RtCmpEqStrict(this.Table, key, Value.FromString(this.ToStringKey)).AsBool()) {
  return Value.Undefined();
}
return Value.FromRef(ValueTag.HostRef, this.Table.CreateHostRef(this.SymbolToStringId, 0));
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
// 或者是一个**带可调用载荷的对象**——第 145 轮把后者接了进来）：
// **不造实例、不看原型**——让宿主自己把对象造好并返回，这正是 JS 的
// 「构造函数返回了对象就用它」。造实例再让宿主往里填也行，但那样引擎就得先猜
// 「宿主想要哪种对象」；**把这件事留给知道它的那一层**。
//
// **两条候选修法**（第 138 轮记在这里的）：
//   ① 让宿主引用带一张静态属性表（回收器要多跟一条边，见 `heap.xl.md` 的 `AttachCallable`）；
//   ② **让「对象上的可调用载荷」算数**——第 145 轮选的这条。
// 选②之后 `Date` 不必再靠降级层那条特例（`new Date(ms)` 与 `Date.now()` 同时成立），
// 这一支也不再需要那句「说清原因」的抛。
if (this.IsHostCallable(callee)) {
  // **先造实例**（第 617 轮）：`bind` 那一格的目标**要的是实例**，
  // 而实例以前是**调完之后**才造的 ⇒ `new (fn.bind(null))(5)` 报
  // 「a bound function must be an object」（`self` 收到的是 `undefined`）。
  // **先造不影响宿主那一档**：`new Map()` / `new Date(ms)` 这一类**不需要**引擎的实例，
  // 宿主自己造好交回来——所以下面那条「宿主返回了对象就用它」照旧成立
  //（多造的那个实例没人引用，回收器收走）。
  // **`prototype` 那一格照旧**：`CreateInstance` 读的是 `PrototypeKey`，
  // 于是 `new (Point.bind(null))(5) instanceof Point` 仍然成立
  //（`BoundPoint.prototype` 在 JS 里是 `undefined`——本引擎读不到就退回 `Protos.Object`，
  //  与「点那一档」同形；`Point.prototype` 那一层**本引擎不另做**，记在台账里）。
  // **实例只在「对象那一档」现造**（第 617 轮）：`bind` 造出来的东西
  // 是一个**带可调用载荷的对象**（`IsBoundCall`），它要的正是这个实例；
  // 而 `Map` / `Date` 这一类**宿主引用**（`IsBoundCall` 为假）根本用不着它——
  // 宿主自己造对象，引擎这一格一个字节都不读。
  // **不现造的理由不只是省一次分配**（**实测撞到的**）：照「凡是宿主可调用值就造」
  // 写，`new Set()` 每轮多造一个对象 ⇒ 回收的**时机**整体提前 ⇒
  // `c371-rt-large-collections` / `c371-rt-gc-churn-forms` 两条当场报
  // `invalid handle: 74`（那两条量的是**大集合 + 回收换手**，本来就在阈值边上）。
  // **多造的东西本身没错**（它没人引用、会被收走），错的是**没量过的时机变化**。
  const constructed = this.IsBoundCall(callee)
    ? this.Guard(() => this.CreateInstance(callee)) : Value.Undefined();
  const savedConstructThis = this.HostConstructThis;
  this.HostConstructing = true;
  this.HostConstructThis = constructed;
  // **返回槽照旧交 `instr.B`**（第 617 轮）：宿主把它的返回值写在那里
  //（「展开已经发生」那一档**不写**，见 `CallHostValue`），下面就地读它。
  // **`-1` 是错的**（第一版写的就是它）：那一格的含义是「没有调用者」
  // ⇒ `DoCallValue` 把结果写进 `this.Result` 并把机器置成 `Halted`
  // ⇒ **整份脚本在这一句上停下来**、一声不响（实测：只印到第二行就退出了）。
  this.DoCallValue(frame, callee, instr.B, instr.C, instr.B, constructed, 0);
  this.HostConstructing = false;
  this.HostConstructThis = savedConstructThis;
  // **JS 的 `[[Construct]]` 收尾就地做完**（第 617 轮）：目标**返回了对象就用它**
  //（`function C() { return {a: 1} }` 与 `new Map()` / `new Date(0)` 都属于这一档），
  // 否则用**当初造出来的那个**（`Point.bind(null)` 那一趟目标返回 `undefined`
  // ⇒ 交出去的是实例，于是 `new (Point.bind(null))(5).x` 是 `5`）。
  // **这一句必须在这里**：`DoReturn` 那条收尾只服务**闭包**
  //（`ConstructTarget` 是帧上的字段），而宿主那一趟**根本没有帧**。
  // **为什么直接读返回槽、不另记一格**：宿主那条路本来就把它交回在 `returnSlot` 上
  //（`DoCallValue` 那一支），再抄一份就是「同一个事实两处存」——
  // 而两处会漂的那一天，症状正是 `new Map()` 给回一个空对象。
  // **`null` 那一档不必特判**：`CallHostValue` 在「展开已经发生」时**不写这一格**
  // ⇒ 读到的是**上一次**留下的东西，可控制流已经交给处理点、这一句根本到不了。
  const answered = frame.Slots[instr.B];
  frame.Slots[instr.B] = answered.IsObject() ? answered : constructed;
  return;
}
// **普通对象当构造函数：给一句说清原因的话**（不是「calling a non-closure value」——
// 那种消息会让人以为是**调用**写错了）。第 145 轮之后这一支的含义变窄了：
// 「对象 + 可调用载荷」那一档**已经能当构造函数**（上面那条），
// 走到这里的对象**没有那一格**（所以它是「拿一个数据对象去 `new`」）。
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
// **`class X extends Array` 的实例是一个「真的数组」**（第 335 轮）：
// `new MyList()` 在 JS 里是 `Array.isArray(m) === true`、`m.length` / `m.push` 都成立——
// 因为 `super()` 调的 `Array` **自己造了一个数组**，而「基类构造返回对象就用那个对象当 `this`」
// 是 JS 的规矩。
//
// **本仓的模型里那一步不存在**（实例在 `new` 的那一刻就造好了，`super()` 的结果被丢掉），
// 所以这里退一步：**看原型链**——链上先碰到 `protos.Array` 就造数组，否则造普通对象。
// **这是一条代理判据**（与第 203 轮撤掉的那条「父类有没有构造函数」同一类），
// 它**不**完全等价：`Object.setPrototypeOf(X.prototype, Array.prototype)` 而不 `extends Array`
// 在 JS 里给的是普通对象，这里会给数组。**实测到的差别只有这一种**（exotic），
// 而它**比现状更接近 JS**（现状是「`extends Array` 的实例根本不是数组」——
// 判据 `rt-instanceof-array-subclass` / `c323-rt-array-subclass-and-methods` 量的就是它）。
// **要真做对**：让 `super(...)` 的结果能成为 `this`（那是「`this` 由基类决定」那一整套），
// 记在台账里。
const isArrayInstance = proto === protos.Array || RtChainHas(this.Table, Value.FromObject(proto), protos.Array);
const handle = isArrayInstance ? this.Table.CreateArray() : this.Table.CreateObject();
this.Table.Get(handle).Proto = proto;
return isArrayInstance ? Value.FromArray(handle) : Value.FromObject(handle);
```

## field ToStringKey:int = 0

**`s.toString` 里的 `toString` 是哪个字符串**（第 277 轮）——与 `DescriptionKey` 同一个理由：
符号不是对象，那一格只能由引擎特判，而引擎不认识 `"toString"` 这几个字母。

## field SymbolToStringId:int = 0

**`s.toString()` 该调哪一个能力号**（第 277 轮，由语言层给；`0` = 没设）。

**为什么这一格要单独存在**：`description` 那一支返回的是一个**值**
（描述就在堆里那一格，取出来就完了），而 `toString` 这一支要返回一个**能被调的东西**——
也就是一个 `HostRef`。**而能力号是语言层的事**（引擎根本不认识那些号，
与 `ErrorKindType` 那一条同一个道理），所以号**也只能由语言层交进来**。

**两个 `0` 都要判**：`ToStringKey` 是「找哪个键」、`SymbolToStringId` 是「调哪个号」——
只判一个的话，没接上时会给一个 `HostRef(0)`，而那不是个东西
（症状是「调用一个非闭包」，离「引擎没接上」这个真相很远）。

## method SetToStringKeys:(keyHandle:int, methodId:int)=>void

语言层告诉这台机器：**符号上那一格叫什么、该调哪个号**（第 277 轮）。

**两格一次给**（与上面两个 setter 不同）：它们**必须同时有效**——
分开给的话中间那一段是「键认得出、号是 `0`」，而那一段里 `s.toString` 会给一个假的可调用值。
**收成一次**就没有那一段。

```ts
this.ToStringKey = keyHandle;
this.SymbolToStringId = methodId;
```

## method SetPrototypeKey:(handle:int)=>void

语言层告诉这台机器：**构造函数的原型挂在哪个属性名下**（给的是字符串句柄）。

给 `0` 就回到「一律用 `Protos.Object`」的老行为——**没接上时不说谎，只是不特殊**。

```ts
this.PrototypeKey = handle;
```

## method SetDescriptionKey:(handle:int)=>void

语言层告诉这台机器：**`s.description` 里的 `description` 是哪个字符串**（字符串句柄）。

给 `0` 就回到「符号上什么都读不到」的老行为——**没接上时不说谎，只是不特殊**
（与 `SetPrototypeKey` 一字不差）。

```ts
this.DescriptionKey = handle;
```

## method Raise:(value:Value)=>void

**宿主请求一次脚本站内异常**（第 121 轮补；见 `RaiseRequest` 那一段）。

**它不在调用点上抛**：宿主只是**留下**这个值，真正的展开发生在宿主调用**返回之后**
（那两处检查）——因为「抛」这件事必须由**当时正握着帧栈**的那一层做
（宿主函数没有自己的帧，它手上只有一个 `room`）。

**传进来的必须是脚本要接住的那个值**（`Error` 对象、字符串、随便什么）——
「宿主异常的文字」怎么变成「脚本的值」是**语言层**的事，引擎不认识 `Error` 长什么样。

```ts
this.RaiseRequest = value;
```

## method TakeRaise:()=>Value | null

**取走那次请求**（取走即清空）——没有请求给 `null`。

**为什么必须取走**：留着它，**下一次**宿主调用会莫名其妙地抛上一次的错
（`RaiseRequest` 那一格是「只在那一瞬有效」的）。

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

**第一件事是给 `Throws` 加一**（第 228 轮）：**展开到处理点**那一支（下面那个 `return`）
不会改 `Status`——可是**外面那些语言内建必须知道这一次重入出事了**
（见 `CallFailed`：没有这一格的话，`try { xs.forEach(抛) } catch {}` 里
`forEach` 会接着把剩下几项跑完，而那个 `catch` 明明已经接住了）。
**加一而不是置一个标志**：`CallNative` 比的是**前后两个数**——
置标志的话，上一次**已经被脚本处理掉**的那一抛会一直留着，把后面每一次内建都骗了。

**第二件事是判「这一次展开有没有跨过重入那一段的边界」**（第 228 轮）：
处理点的层深**小于等于** `NativeBoundary` ⇒ 它在外层 ⇒ `NativeEscaped` 置真
（`CallFailed` 的第三半）。**为什么非它不可**：回调不一定走 `CallNative`——
语言内建**直接调**闭包时走的是 `DoCallValue`（压帧 + 分派循环），
那条路上 `Throws` 根本没变过（现场：`sort` 的比较器里抛，而同一次运行里
在它前面已经抛过一次、被脚本接住了 ⇒ 计数没变 ⇒ 内建照旧转下一圈）。
**层深是唯一说得清「在外层」的东西**：帧句柄只答得了「那一帧还在不在栈上」。

```ts
this.Throws = this.Throws + 1;
this.Pending = value;
// **挂着的帧那几条要留住**（第 330 轮，见 `IsSuspendedFrame`）：
// 「帧不在栈上」这一条**答不了「它死了没有」**——`await` 摘下去的帧一会儿还要回来，
// 它那一层 `try` **仍然在册**。这一趟展开会**顺手走过**它的条目，
// 照原来的写法就**丢掉了** ⇒ 回来那一抛**一个处理点都找不到**
//（症状：`try { await f() } catch { … }` 里 `catch` 不跑，**一句异常都没有**）。
//
// **「落哪一条」按帧的层深认，不按「谁后压进这一摞」**（第 766 轮，见下面那一段）。
let landing = -1;
let landingDepth = -1;
let landingPc = -1;
// **展开不能跨过 async 帧**（第 610 轮）：一个 async 帧就是**一道墙**——
// 它里面抛出来的东西**只把它的承诺拒绝掉**，不许落到它**外面**那些 `try` 上。
//
// **实测**（最小判据 `a-v4`）：
//
//     async function boom() { throw new Error("boom"); }
//     async function g1() { try { boom(); } catch { console.log("g1-call-caught"); } }
//
// Node 打 `called`（这一抛**一个字都不往外冒**），本仓打 `g1-call-caught`——
// `boom()` 那一抛**顺着帧栈展开进了它调用者的 `catch`**。可调用者手里拿到的是**承诺**、
// 不是「这一次调用抛了」，所以那个 `catch` 在 JS 里**永远不该被这一抛碰到**
//（它要碰的只有 `await` 那一抛，而那是**另一条路**，第 610 轮在 `DoAwait` 里补的）。
//
// **墙在哪**：这一摞帧里**最里面**那个「在本次重入里面」（`i >= NativeBoundary`，
// 与下面那一段**同一条判据**）的 async 帧。处理点落在它**外面**（层深更小）一律跳过
// ⇒ 一个活着的处理点都不剩 ⇒ 下面那一段把这一抛变成**拒绝**
//（第 285 / 299 / 331 轮写好的那条路，一个字都不用改）。
//
// **为什么不能只问「有没有 `AsyncPromise`」**：那一条会把**外层**那些 async 调用者
// 也认成墙——第 331 轮正是为此加了 `NativeBoundary` 那一夹（见下面那一段的账），
// 这里照抄同一条：「是不是墙」与「要不要把这一抛变成拒绝」必须是**同一个判据**。
let asyncWall = -1;
for (let i = this.Frames.Handles.length - 1; i >= 0; i--) {
  const wallHandle = this.Frames.Handles[i];
  const held = this.Table.Get(wallHandle);
  if (held === null || held.Frame === null) continue;
  if (this.DepthOfFrame(wallHandle) < 0) continue;
  if (held.Frame.AsyncPromise > 0 && i >= this.NativeBoundary) {
    asyncWall = i;
    break;
  }
}
// **第一趟：挑落点**（第 766 轮）——判据是**帧的层深**，不是「谁后压进来」。
//
// **为什么非改不可**（实测：生成器里的 `try` 一条都不生效）：
//
//     function* g() { try { yield 1; } catch (e) { console.log("caught"); } }
//     const it = g();
//     it.next();                        // ← 处理点在这里压进这一摞
//     try { it.throw(new Error("x")); } // ← **外层的 try** 在这里压进来（压在它上面）
//     catch (e) { console.log("escaped"); }
//
// Node 打 `caught`，本仓打 `escaped`——那句 `catch` **一声不响**。
// 根子是**挂起的帧恢复时压在别人上面，而它的处理点是更早压进这一摞的**：
// `it.next()` 那一刻帧栈是 `[模块, 生成器]`（记下深度 1），挂起之后生成器那一帧离开了栈、
// **处理点留在这一摞里**；随后模块那一层的 `try` 压进来（深度 0）——于是**数组次序与层深次序相反**。
// 照「取栈顶那一条」走，抛进去的异常就落到了**外层那个 `try`** 上：生成器体里的
// `catch` / `finally` **一次都不跑**，异常直接从 `it.throw()` 那一句冒出去。
// `finally` 那一档的症状更难看：`try { yield 1 } finally { cleanup() }` 里那句清理**一声不响**。
//
// **为什么层深是唯一说得清的判据**：这一摞处理点里「谁更靠里」= 「谁的帧在栈上更深」。
// 同一帧上叠了好几层 `try` 时层深相同 ⇒ **取数组里更靠后的那一条**（更晚压进来 = 更靠里），
// 所以下面的判据写成 `depth >= landingDepth`（相等也认）。
//
// **`await` 那一族同一个形状**（第 330 轮那一段留着的那几条）：被 `await` 摘下去的帧
// 恢复时也是压在调用者上面，而调用者在它挂起之后可能又进了新的 `try`。
for (let i = 0; i < this.Handlers.length; i++) {
  const entry = this.Handlers[i];
  const depth = this.DepthOfFrame(entry.Frame);
  if (depth < 0) continue;
  // **这道墙外面的处理点不算**（见上面那一段）：跳过它，
  // 让这一抛照「一个处理点都不剩」那条路走——那正是 JS 的语义。
  if (asyncWall >= 0 && depth < asyncWall) continue;
  if (landing >= 0 && depth < landingDepth) continue;
  landing = i;
  landingDepth = depth;
  landingPc = entry.Pc;
}
// **第二趟：把这一摞收拾干净**——落点那一条取走，死掉的（帧不在栈上、也没挂着）扔掉，
// 其余**原样留着**。次序一个都不许换：`try_pop` 按帧句柄从后往前找，
// 「同一帧上哪一层更靠里」靠的就是这个次序。
//
// **「其余原样留着」是第 766 轮补上的**：原来那一版把落点**以上**的条目统统弹掉，
// 而按层深挑之后，落点上面那些是**外层还开着的 `try`**——它们要留着接住
// **重抛出来的那一份**（`finally` 跑完 `throw saved` 那一步找的正是它们）。
const survivors: HandlerEntry[] = [];
for (let i = 0; i < this.Handlers.length; i++) {
  if (i === landing) continue;
  const entry = this.Handlers[i];
  if (this.DepthOfFrame(entry.Frame) < 0 && !this.IsSuspendedFrame(entry.Frame)) continue;
  survivors.push(entry);
}
this.Handlers = survivors;
if (landing >= 0) {
  while (this.Frames.Depth() > landingDepth + 1) {
    this.Frames.Pop();
  }
  // **跨过重入那一段的边界了吗**：处理点在外层（层深 ≤ 边界）⇒ 这一段整个被展开了。
  if (landingDepth <= this.NativeBoundary) this.NativeEscaped = true;
  this.Frames.Current().Pc = landingPc;
  return;
}
// **一个活着的处理点都不剩：异常要冒到宿主，帧栈必须清空。**
//
// **清之前先把在册的 async 帧各自拒绝掉**（第 285 轮）：JS 里
// `async function f() { throw new Error("x") }` 的那一抛**不是**宿主错误——
// 它是 `boom()` 那个承诺被**拒绝**（`boom().catch(…)` 接的就是它）。
// 而这**跟有没有经过 `await` 无关**（`await` 只影响这一帧在不在栈上），
// 所以判据是 `AsyncPromise > 0`，不是 `Awaiting.IsRef()`。
//
// **反过来也有一半**：`frame.Awaiting.IsRef()` 为真的帧**不在栈上**，
// 也**不在这一摞句柄里**——它由 `DoReturn` 的 async 那一支结清
//（走到这儿说明它已经不欠谁了）。
//
// **为什么不等 `Frames.Clear()` 之后再说**：那时句柄已经没了。
//
// 留着那些死帧，宿主下一次调用会压在它们上面：被调方返回时 `Frames.IsEmpty()`
// 是假，于是返回值写进了**死帧的槽**——宿主导到的结果是 `undefined`，
// 而「错」离现场几百条指令（判据报的是「`finally` 里的写读回来还是 0」）。
//
// **这条路上当然也跨过了**：一个处理点都不剩 ⇒ 连最外层那一帧都没接住。
this.NativeEscaped = true;
// **从外到内拒绝**（后进先出）：`RejectPromise` 会把等着它们的回调排进微任务——
// 那时的次序就是 JS 的次序（最内层那个承诺先被拒绝）。
//
// **最里面那个 async 帧是「接住这一抛」的那一份**（第 286 轮，见下）——
// 于是这一抛**到此为止**：状态不改、帧栈不清、`Pending` 留着（脚本站内异常
// 与「已经变成拒绝的那一份」是两回事，调用方不会再读它）。
//
// **为什么必须「到此为止」**（第 285 轮那版没做这一步，判据当场红）：
// 一个「**同步就能抛出**的 async 函数」（`async function boom() { throw new Error("x") }`）
// 在 JS 里**一个字都不往外冒**——它只把承诺拒绝掉，
// 于是**同一个片段后面的语句照样跑**（`boom().catch(…)`、`console.log("end")`），
// `.catch` 挂上之后的回调由这一趟的微任务排空来跑。
// 而「冒到宿主」那条路会把**整段脚本**打断：`end` 不印、
// `catch` 永远挂不上去、宿主看到的是 `脚本抛出：async-fail`
//（实测现场就是这个，而 Node 打的是 `end` + `caught async-fail`）。
//
// **判据是「有没有拒绝过」**（一个局部布尔，不是「这帧是不是 async」）：
// 只有**真的交出去了一份拒绝**才算接住——否则（纯脚本机器、没有任何 async 帧）
// 照旧要冒到宿主（第 121 轮那条兜底判据钉的就是它）。
const unwound = this.Frames.Handles;
let converted = false;
// **那一段已经废掉的帧要弹掉**（第 299 轮）——弹到**那个 async 帧自己**为止，
// **它的调用者留着**（照 JS：调用者手里已经拿到承诺了，它后面的语句照样跑）。
let convertedDepth = -1;
for (let i = unwound.length - 1; i >= 0; i--) {
  const dying = this.Table.Get(unwound[i]);
  if (dying === null) continue;
  if (dying.Frame === null) continue;
  // **只有「重入那一段里面」的 async 帧才算接住这一抛**（第 331 轮）——
  // **这一条是实测逼出来的**：判据原来只问 `AsyncPromise > 0`，
  // 于是它会**一路往下找到外层那个 async 调用者**、把它拒绝掉。
  //
  // 现场（这一格的最日常写法）：
  //
  //     async function main() {
  //       const b = await new Promise(() => { throw new Error("executor") })
  //         .catch((e) => "B:" + e.message);
  //     }
  //
  // 执行器那一抛发生在**一次重入里**（`invoke` = `CallNative`），
  // 而语言层**打算自己接**（`PromiseCtor` 那一支收尾问 `takeThrown`）——
  // 可这一趟先把 `main` 的承诺拒绝了、**顺手把 `Pending` 清掉**（下面那一段），
  // 于是 `takeThrown` 什么也拿不到 ⇒ 内层那个承诺**永远不结清**
  // ⇒ 宿主报 `the script is waiting for a promise the host has not settled`。
  // **症状看着像「承诺没结清」**，根子是**这一抛被上面那个帧抢走了**。
  //
  // **判据是层深**：`NativeBoundary` 是**当前这一趟 `RunToDepth` 的起点**
  //（`CallNative` 压帧之前的那一层）——`i >= NativeBoundary` 才说明
  // 「这一帧在**这次重入里面**」。**外层那些调用者一律不算**：
  // 它们手里已经拿到承诺了，要等这一份拒绝**顺着 `await` 链传上去**（上面那条写着理由）。
  //
  // **为什么不是 `>`**：重入的被调方那一帧**正好落在边界上**
  //（`RunToDepth` 是「压帧之前」记的边界）——写成 `>` 会把
  // `[1, 2].map(async (x) => { throw … })` 那一格**放过去**（第 320 轮刚修好的那一格）。
  if (dying.Frame.AsyncPromise > 0 && i >= this.NativeBoundary) {
    // **拒绝的是「它自己那个承诺」**（不是新造一个）——
    // 那个句柄在开帧时就写在帧上了（见 `AsyncPromise`），
    // 而它**已经交到调用者手里**，所以这里要结清的正是它。
    this.RejectPromise(Value.FromObject(dying.Frame.AsyncPromise), value);
    converted = true;
    convertedDepth = this.DepthOfFrame(unwound[i]);
    // **只拒绝最里面那一个**（后进先出）：它外面的那些 async 帧
    // 是**调用者**——它们的承诺要等这一帧的拒绝**顺着 `await` 链传上去**
    //（那正是 JS 的语义：`await` 一个被拒绝的承诺会抛，于是外层那条
    // `DoThrow` 再走一遍这一支）。一次把整摞都拒绝掉是**错的**：
    // 中间那些帧的 `try { … } catch { … }` 会被跳过（实测：`tryInside` 那条
    // 打印的是「没接住」而不是 `handled:…`）。
    break;
  }
}
if (converted) {
  // **第 299 轮补的三句**——第 285 轮那一版**只拒绝、不收拾**：
  // 「到此为止」那一条**只管住了状态**（不置 `Threw`），
  // 可**帧一个都没弹**、`Pending` 也**留着那一抛**。
  //
  // **为什么要弹**：那些帧已经**废了**（它们的处理点刚刚被逐个作废），
  // 留着的话栈顶就是**那一帧**——而调用者在**它下面**。
  // 实测的症状正是从这个「栈顶错了」长出来的：那一抛之后
  // **同一个片段里后面新建的生成器一个值都不产出**（`[...g()]` 给空数组，
  // 而 `node` 给两个值）——**一句异常都没有**、退出码还是 0，
  // 判据 `c298-async-reject-then-sync` 与 `e2e-mixed-everything` 量的就是它。
  //
  // **`Pending` 也要清**（与 `TakeRaise` 那条一字不差）：那一抛已经**变成一份拒绝**了，
  // 不再是「脚本站内异常」——留着它，下一次宿主调用会读到**上一次的错**。
  // **状态放回哪一档不能只看 `Finished`**（第 331 轮改，与 `TakeThrown` 那一处**同一个根**）：
  // `Finished` 说的是「**入口函数**返回了没有」，而**微任务那一趟**里它已经是真
  //（入口早返回了），可这一趟**仍然有帧要跑**——`DrainMicrotasks` 是拿 `RunToDepth(0)` 跑的、
  // 它把挂起的帧 `PushBack` 回来接着跑。置成 `Halted` ⇒ **那个分派循环立刻停**
  // ⇒ 被重入推回来的那一帧**停在半句话上**，而 `DrainMicrotasks` 只判
  // 「`Ready` 或 `Halted` 都算正常」 ⇒ **一声不响地跳到下一个微任务**（**静默错值**）。
  //
  // **现场**（g2 那条探针）：
  //
  //     async function thrower() { throw new Error("async"); }
  //     async function main() {
  //       await null;                                            // ← 微任务里推回来的一帧
  //       const d = await thrower().catch((e) => "D:" + e.message);
  //       console.log(d);                                        // ← 永远不执行
  //     }
  //
  // Node 印 `D:async`，本仓**一行都不印**；而**把 `await null` 去掉**就对了
  //（那时这一趟是入口那一趟，`Finished` 为假）——**同一句话两种结局**，
  // 判据差的就是「谁在跑这一趟」。
  // **换成「帧栈空不空」**：还有帧要跑 ⇒ `Ready`；真的空了 ⇒ `Halted`。
  while (this.Frames.Depth() > convertedDepth) this.Frames.Pop();
  this.Pending = new Value();
  this.Status = this.Frames.IsEmpty() ? VmStatus.Halted : VmStatus.Ready;
  // **收下的这一抛，对「外面那个内建」不是一次失败**（第 640 轮）——
  // 上面那一句只把状态放平，可 `CallFailed` 还看两样（`Throws` 计数、`NativeEscaped`），
  // 而那两样在**这一支**上说的都不是「回调出事了」：
  //   · `Throws` 是**展开次数**，可这一抛**没有展开到任何人手上**——它变成了一份拒绝，
  //     在 JS 里 `async function f() { throw x }` 对调用者**一个字都不冒**；
  //   · `NativeEscaped` 也在上面那句 `Frames.Clear()` 之前置过真（那时还不知道这一抛接不接得住）。
  //
  // **判据是「重入那一段里还有活帧没有」**（`convertedDepth > NativeBoundary`）：
  // 重入的被调方那一帧**正好落在边界上**（见 `DoThrow` 上面那一条）——
  // 它比边界深 ⇒ 死掉的只是**被它调用的**那个 async 帧，回调自己**还活着**、
  // 马上会把返回值写进 `NativeReturnSlot` ⇒ 内建该照常转下一圈。
  //
  // **反过来那一档不能放**：`[1,2].map(async (x) => { throw … })` 里**回调自己**就是那个 async 帧
  // （`convertedDepth === NativeBoundary`）⇒ 它被弹掉之后**没有人会交返回值**，
  // 内建必须收摊（照旧置 `NativeFailed`）。
  //
  // **实测的现场**（判据 `c639-e2e-async-throw-inside-map-array`）：
  // `[1, 2, 3].map((n) => risky(n))` 里 `risky(3)` 同步抛出 ⇒ `map` 拿到 `undefined`
  // ⇒ `cannot read properties of undefined`、`main` 后面一个字都不跑；
  // Node 那边 `map` 给一个**被拒绝的承诺**、`Promise.allSettled` 照常收。
  if (convertedDepth > this.NativeBoundary) {
    this.Throws = this.Throws - 1;
    this.NativeEscaped = false;
  }
  return;
}
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

## method IsSuspendedFrame:(handle:int)=>bool

**这一帧是不是「不在栈上、但还活着」**（第 330 轮）。

**为什么单开一条判据**：`DepthOfFrame` 给 `-1` 只说「不在栈上」，
而**不在栈上**有**两种**死法活法：

| 怎么离开栈的 | 还活得成吗 | 谁负责 |
| --- | --- | --- |
| `return` / 抛出去了（`DoReturn`、展开） | **死了** | 那一帧的事**到此为止** |
| `await` 摘下去（`DoAwait`） | **活着** | 承诺结清时 `ResolvePromise` / `RejectPromise` 把它排回队列 |
| `yield` 摘下去（`DoSuspend`） | **活着** | 生成器对象攥着它（`it.next()` 那条路） |

**判据是「上一次为什么离开栈」**——`SuspendedInAwait` 答 `await` 那一档
（它由 `resume` 清掉，所以「真」⟺「现在正挂着」）；
生成器那一档问 `Generator.State`（`Suspended` 就是还攥着，`Done` 就是跑完了）。

**`Awaiting.IsRef()` 答不了这个**：它**恢复之后还留着**（见那一格的说明），
所以「有它」只说明**曾经**等过。

**它只在展开那一条路上用**（`DoThrow`）——那里的问题是
「这一条处理点还算不算数」，而不是「这一帧在不在跑」。

```ts
if (!this.Table.IsValid(handle)) return false;
const frame = this.Table.Get(handle).AsFrame();
if (frame.SuspendedInAwait) return true;
if (frame.Generator > 0 && this.Table.IsValid(frame.Generator)) {
  return this.Table.Get(frame.Generator).AsGenerator().State === GeneratorState.Suspended;
}
return false;
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
  // **算术要 `room` / `call` / `protos`**（第 198 轮）：`+` 的第一步是 `ToPrimitive`，
  // 而它**可能调脚本**（`valueOf` / `Symbol.toPrimitive`）——
  // 与 `GetProperty`（`instanceof` 那一支）要的是**同一套参数**。
  const addProtos = this.Protos;
  if (addProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtAdd(this.Room(), this.Native(), addProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.Sub) {
  RequireArgc(argc, 2, "sub");
  const subProtos = this.Protos;
  if (subProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtSub(this.Room(), this.Native(), subProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.Mul) {
  RequireArgc(argc, 2, "mul");
  const mulProtos = this.Protos;
  if (mulProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtMul(this.Room(), this.Native(), mulProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.Div) {
  RequireArgc(argc, 2, "div");
  const divProtos = this.Protos;
  if (divProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtDiv(this.Room(), this.Native(), divProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.Mod) {
  RequireArgc(argc, 2, "mod");
  const modProtos = this.Protos;
  if (modProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtMod(this.Room(), this.Native(), modProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.Neg) {
  RequireArgc(argc, 1, "neg");
  const negProtos = this.Protos;
  if (negProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtNeg(this.Room(), this.Native(), negProtos, this.Table, slots[base]));
}
// **七条位运算**（第 147 轮）：`& | ^ << >>` 与 `~` 的结果都落在 `int32` 里，
// 只有 `>>>` 可能超出（`-1 >>> 0` 是 `4294967295`）——那一条自己走 `MakeNumber`。
// **`& | ^` 与逻辑那两条同名而不同物**：`&&` / `||` 在降级层落成**控制流**，
// 根本不到这一层来（`ir.xl.md` 的 `BitOr` 那条写着这一句）。
//
// **四样参数与算术那一族同款**（第 623 轮）：`ToInt32` 的前一步是 `ToNumber`，
// 而 `ToNumber` 要 `ToPrimitive`（对象那一档要调 `valueOf` / `toString`）⇒
// `room` / `call` / `protos` / `table` 一样都不能少（原来只给 `table`，
// 于是 `"3" | 0` 报 `unimplemented: arithmetic on a non-numeric operand`）。
if (id === RtOp.BitAnd) {
  RequireArgc(argc, 2, "bit_and");
  const bitProtos = this.Protos;
  if (bitProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtBitAnd(this.Room(), this.Native(), bitProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.BitOr) {
  RequireArgc(argc, 2, "bit_or");
  const bitProtos = this.Protos;
  if (bitProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtBitOr(this.Room(), this.Native(), bitProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.BitXor) {
  RequireArgc(argc, 2, "bit_xor");
  const bitProtos = this.Protos;
  if (bitProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtBitXor(this.Room(), this.Native(), bitProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.BitNot) {
  RequireArgc(argc, 1, "bit_not");
  const bitProtos = this.Protos;
  if (bitProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtBitNot(this.Room(), this.Native(), bitProtos, this.Table, slots[base]));
}
if (id === RtOp.Shl) {
  RequireArgc(argc, 2, "shl");
  const bitProtos = this.Protos;
  if (bitProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtShl(this.Room(), this.Native(), bitProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.Shr) {
  RequireArgc(argc, 2, "shr");
  const bitProtos = this.Protos;
  if (bitProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtShr(this.Room(), this.Native(), bitProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.UShr) {
  RequireArgc(argc, 2, "ushr");
  const bitProtos = this.Protos;
  if (bitProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtUShr(this.Room(), this.Native(), bitProtos, this.Table, slots[base], slots[base + 1]));
}
if (id === RtOp.Not) {
  RequireArgc(argc, 1, "not");
  return RtNot(this.Table, slots[base]);
}
// **四条关系也要 `room` / `call` / `protos`**（第 198 轮）：`CompareValues` 的第一步就是
// `ToPrimitive`（hint `number`）——`date1 < date2` 靠它。
// 四格合成一段：**准备那两句（查 argc、取原型表）只写一次**——
// 四份各写一遍正是这一族最容易漂的地方（而 `RtOpName(id)` 让报出来的名字仍旧对得上号）。
if (id === RtOp.CmpLt || id === RtOp.CmpLe || id === RtOp.CmpGt || id === RtOp.CmpGe) {
  RequireArgc(argc, 2, RtOpName(id));
  const relationProtos = this.Protos;
  if (relationProtos === null) throw new Error("no prototype table");
  const left = slots[base];
  const right = slots[base + 1];
  if (id === RtOp.CmpLt) {
    return this.Guard(() => RtCmpLt(this.Room(), this.Native(), relationProtos, this.Table, left, right));
  }
  if (id === RtOp.CmpLe) {
    return this.Guard(() => RtCmpLe(this.Room(), this.Native(), relationProtos, this.Table, left, right));
  }
  if (id === RtOp.CmpGt) {
    return this.Guard(() => RtCmpGt(this.Room(), this.Native(), relationProtos, this.Table, left, right));
  }
  return this.Guard(() => RtCmpGe(this.Room(), this.Native(), relationProtos, this.Table, left, right));
}
if (id === RtOp.CmpEqStrict) {
  RequireArgc(argc, 2, "cmp_eq_strict");
  return RtCmpEqStrict(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.CmpEqLoose) {
  RequireArgc(argc, 2, "cmp_eq_loose");
  // `==` 也要 `room` / `call` / `protos`（第 198 轮）：对象那一支要 `ToPrimitive`。
  const looseProtos = this.Protos;
  if (looseProtos === null) throw new Error("no prototype table");
  return this.Guard(() => RtCmpEqLoose(this.Room(), this.Native(), looseProtos, this.Table, slots[base], slots[base + 1]));
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
  // **`argc` 从 2 起，可以到 3**（第 238 轮）：第三格是**函数名**（一个字符串值）。
  // **第 291 轮又开了第四格**：**形参个数**（一个整数，`fn.length` 用它）——
  // 与名字同一个理由（「第一个默认值之前有几个」是**语法上的事**，引擎读不出来）。
  // **为什么名字要走这里、而不是另开一条算子**：`new_closure` 是**所有脚本函数**出生
  // 的那一道门（`MakeClosure` 那一段写着），而名字**只有造它的那一方知道**
  //（降级层手里就有那个标识符的文本 或者 `PendingFunction.Name`）——
  // 另开一条 `set_fn_name` 就是「造完再补一格」，而那一格**只在造的那一刻有意义**。
  // **不给第三格就是匿名**（`MakeClosure` 那一档留着）——
  // 这一条是**向后兼容**的关键：降级层不传的地方照旧。
  //
  // **`RequireArgc` 是「严格等于」的**（见它的定义）——所以这里**三档各判一次**，
  // 而不是「先按 2 判、再看 `argc >= 3`」（那样 `argc === 3` 会在**第一句**就被拒，
  // 报的是 `rt op new_closure expects 2 arguments, got 3`——
  // **一句话听起来像降级层多传了一格**，其实是**这一句自己写窄了**，第 238 轮实测踩过）。
  if (argc === 5) {
    return this.MakeClosure(slots[base], slots[base + 1].AsInt(), slots[base + 2], slots[base + 3].AsInt(),
      slots[base + 4]);
  }
  if (argc === 4) {
    return this.MakeClosure(slots[base], slots[base + 1].AsInt(), slots[base + 2], slots[base + 3].AsInt(),
      Value.Undefined());
  }
  if (argc === 3) {
    return this.MakeClosure(slots[base], slots[base + 1].AsInt(), slots[base + 2], 0, Value.Undefined());
  }
  RequireArgc(argc, 2, "new_closure");
  return this.MakeClosure(slots[base], slots[base + 1].AsInt(), Value.Undefined(), 0, Value.Undefined());
}
if (id === RtOp.GetProp) {
  RequireArgc(argc, 2, "get_prop");
  if (this.Protos === null) throw new Error("no prototype table");
  // **这里要包 `Guard`**（第 136 轮）：`GetProperty` 现在会为「读 `null` / `undefined`
  // 的属性」抛（JS 的 `TypeError`），而那一抛**必须走错误工厂**才能被脚本的
  // `try` 接住——不包的话整份程序照样挂（与 `str + obj` 那条修法同源）。
  // **原型表要先落到一个局部常量上**：`this.Protos` 是**可变的字段**，
  // 所以上面那句 `=== null` 的收窄**进不了闭包**（编译期报
  // 「`Protos | null` 不能当 `Protos`」，位置正好在这一行）。
  const propReceiver = slots[base];
  const propKey = slots[base + 1];
  // **内建构造函数身上的 `prototype`**（第 137 轮）：它们是 `HostRef`、**没有属性表**，
  // 所以 `class MyErr extends Error` 里读 `Error.prototype` 读到的是 `undefined`，
  // 紧接着 `set_proto` 报「set_proto needs two objects」（现场离「`Error` 没有属性表」
  // 这个真相很远）。这一条把**登记表**那一格借出来——
  // 键**按内容比**（`RtCmpEqStrict`）：`PrototypeKey` 那格字符串与源码里写的
  // `prototype` 是**两个堆对象**（字符串不去重），比句柄永远不相等
  //（第一版就是比句柄，于是 `extends Error` 照样报同一句话）。
  if (propReceiver.Tag === ValueTag.HostRef && this.PrototypeKey > 0
    && propKey.Tag === ValueTag.String
    && RtCmpEqStrict(this.Table, propKey, Value.FromString(this.PrototypeKey)).AsBool()) {
    const builtinProtoValue = this.ConstructorProtoOf(this.Table.Get(propReceiver.Ref).Host!.CapabilityId);
    if (builtinProtoValue > 0) return Value.FromObject(builtinProtoValue);
  }
  const propProtos = this.Protos;
  // **符号上的 `description`**（第 241 轮）：符号**不是对象**（没有属性表、
  // 也没有原型那一格），所以 `GetProperty` 那条路**走不到它**——
  // 这一支是**唯一**能答那一格的地方（见 `DescriptionKey` 那一段的理由）。
  // **键按内容比**（字符串不去重——比句柄永远不相等，与 `PrototypeKey` 同一条纪律）。
  if (propReceiver.Tag === ValueTag.Symbol && this.DescriptionKey > 0
    && propKey.Tag === ValueTag.String
    && RtCmpEqStrict(this.Table, propKey, Value.FromString(this.DescriptionKey)).AsBool()) {
    const symbolRecord = this.Table.Get(propReceiver.Ref).AsSymbol();
    // **没描述给 `undefined`**（`0` 那一格表示「没有」，
    // 而 `Symbol("").description` 是**空串**——两件事不能混）。
    if (symbolRecord.Description === 0) return Value.Undefined();
    return Value.FromString(symbolRecord.Description);
  }
  // **符号上的 `toString`**（第 277 轮）：与上一支同一个理由（符号没有原型那一格），
  // 差别只有「**交出去的是一个能被调的东西**」——也就是一个 `HostRef`
  //（`description` 那一支交的是一个值，取出来就完了）。
  // **两格都要判**（`ToStringKey` 是「找哪个键」、`SymbolToStringId` 是「调哪个号」）：
  // 只判键的话，语言层还没接上号时这里会交出一个 `HostRef(0)`——
  // 而调用它的症状是「调用一个非闭包」，离「引擎没接上」这个真相很远。
  if (propReceiver.Tag === ValueTag.Symbol && this.ToStringKey > 0 && this.SymbolToStringId > 0
    && propKey.Tag === ValueTag.String
    && RtCmpEqStrict(this.Table, propKey, Value.FromString(this.ToStringKey)).AsBool()) {
    return Value.FromRef(ValueTag.HostRef, this.Table.CreateHostRef(this.SymbolToStringId, 0));
  }
  // **读 `null` / `undefined` 的属性是「类型失败」**（第 139 轮）：
  // JS 那边这一类全是 `TypeError`——`kind` 那一格就是给它留的。
  return this.Guard(() => GetProperty(this.Room(), this.Native(), propProtos, this.Table, propReceiver, propKey),
    ErrorKindType);
}
if (id === RtOp.GetPropFrom) {
  // **从指定的原型起读**（第 243 轮）：三格 = 起点 / 键 / 接收者——
  // `super.v` 那一格要的正是它（理由见 `props.xl.md` 的 `GetPropertyFrom`）。
  RequireArgc(argc, 3, "get_prop_from");
  return this.Guard(() => GetPropertyFrom(this.Room(), this.Native(), this.Table,
    slots[base], slots[base + 1], slots[base + 2]), ErrorKindType);
}
if (id === RtOp.SetProp) {
  RequireArgc(argc, 3, "set_prop");
  // **非严格模式：写不下去也一声不响**（第 333 轮）——
  // `SetProperty` 交回的是「写没写下去」，而**赋值语句不看它**
  //（`o.x = 1` 在冻结的对象上什么都不做，Node 也是这样；理由写在 `props.xl.md`）。
  // **表达式本身的值照旧是右边那个**：`y = (o.x = 5)` 给 `5`（JS 的口径）。
  return this.Guard(() => {
    SetProperty(this.Room(), this.Native(), this.Table, slots[base], slots[base + 1], slots[base + 2]);
    return slots[base + 2];
  });
}
if (id === RtOp.SetPropFrom) {
  // **从指定的原型起写**（第 326 轮）：四格 = 起点 / 键 / 值 / 接收者——
  // `super.x = v` 那一格要的正是它（理由见 `props.xl.md` 的 `SetPropertyFrom`）。
  // **失败类别与 `set_prop` 同一档**（`ErrorKindType`）：它们失败的原因是同一族
  //（不可写 / 访问器没有 setter / 接收者不是对象）——分两档就是在两处猜「这算哪种错」。
  // **第 333 轮起「写不下去」不再是抛**（见上面 `set_prop` 那一段）：`super.x = v`
  // 与非严格赋值是同一条语义（JS 里 `super.x = v` 也是「`[[Set]]` 返假就拉倒」），
  // 所以这里同样只看副作用、把右边那个值交出去。
  RequireArgc(argc, 4, "set_prop_from");
  return this.Guard(() => {
    SetPropertyFrom(this.Room(), this.Native(), this.Table,
      slots[base], slots[base + 1], slots[base + 2], slots[base + 3]);
    return slots[base + 3];
  });
}
if (id === RtOp.SetProto) {
  RequireArgc(argc, 2, "set_proto");
  return RtSetProto(this.Table, slots[base], slots[base + 1]);
}
if (id === RtOp.GetProto) {
  // **取原型**（第 361 轮）：对象字面量方法里的 `super.m()` 靠它拿到「家对象的原型」
  // （家对象就是 `this`）。与 `SetProto` **同一个形状**、只有一格实参。
  RequireArgc(argc, 1, "get_proto");
  return RtGetProto(this.Table, slots[base]);
}
if (id === RtOp.Instanceof) {
  RequireArgc(argc, 2, "instanceof");
  const protosForInstanceOf = this.Protos;
  if (protosForInstanceOf === null) throw new Error("no prototype table");
  const instanceRight = slots[base + 1];
  // **内建构造函数走登记表**（第 137 轮）：它们是 `HostRef`，**没有属性表**，
  // 所以下面那条「读 `prototype` 属性」的路永远读不到东西——
  // `[] instanceof Array` / `new Error() instanceof Error` 报的都是同一句。
  // 登记由语言层在建全局对象时做（`ConstructorProtos` 那一段写着为什么不让引擎认号）。
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
  // **原始值接收者给 `true`**（第 748 轮，**普查当场红的**）：JS 里 `delete` 对一个
  // 原始值**从来不动手**——`ToObject` 造出来的那个包装对象当场被丢掉，而规范那一步
  // （`DeletePropertyOrThrow`）只看「这一步成功了吗」，松松散散的模式下答案恒为 **`true`**。
  // Node 实测：`delete "abc"[0]` 给 `true`、`"abc"[0]` 照样是 `"a"`（那一格删不掉）；
  // `delete (1).x` 同样给 `true`。
  // **原来这里响亮地抛**（`unimplemented: delete on a primitive receiver`）⇒
  // **整份文件进不来**，而那是一条**遍地都是**的写法（`delete (s as any)[0]` 那种探测，
  // 判据 `p748a-a08` 现场就是这个）。
  // **排在 `ToPropertyKey` 那一步之前**：键的**求值**仍然发生（那是实参的求值，
  // 上面已经做完了），而「删哪一格」对原始值根本没有意义——没有第二份账要记。
  // **它不是「静默收下」**：这正是 JS 的答案，返回值与 Node 逐字节相同。
  // **`null` / `undefined` 要先抛 `TypeError`**（第 772 轮，与 `set_prop` 那一族**同一句**）：
  // `delete u.x`（`u` 是 `undefined` / `null`）在 JS 里抛 `TypeError`
  // （求那个成员引用就要 `RequireObjectCoercible`），而**别的原始值**才是「恒为真」。
  // 本条判据原来把两档合在一句 `IsObject()` 里 ⇒ `delete u.x` **静默给 `true`**
  // （判据 `runtime/round772/r772b-02` 现场：Node 打 `throw:TypeError`、本仓打 `ok:boolean:true`）。
  if (!slots[base].IsObject()) {
    if (slots[base].Tag === ValueTag.Undefined || slots[base].Tag === ValueTag.Null) {
      const delWhat = slots[base].Tag === ValueTag.Null ? "null" : "undefined";
      return this.Guard(() => {
        throw new TypeError("cannot delete properties of " + delWhat);
      }, ErrorKindType);
    }
    return Value.FromBool(true);
  }
  // **键先过 `ToPropertyKey`**（第 706 轮，**普查当场红的**）——与上面 `in` 那一格
  // **一字不差**（第 123 轮就写着「JS 的 `in` 也走 ToPropertyKey」）：
  // `delete o[1]` 里键是一**个数**、`delete o[k]`（`k` 是 `"1"`）里是一**段文本**，
  // 而 `props.xl.md` 的 `KeyMatches` 见到别的键**当场抛**
  //「property keys must be strings or symbols」——**整份文件进不来**
  //（判据 `p706b-e01` / `p706b-e02` / `p706b-e06` / `p706b-e07`）。
  //
  // **同一个根在 `get_index` / `set_index` 那两处第 190 / 191 / 305 轮就收过了**：
  // 读得到、写得了、却**删不掉**，是这条链上唯一漏掉的一环（`delete` 那一支第 92 轮
  // 只补了「降级这一支」，没补「键怎么归一」）。
  // **数组元素仍然照删**：`DeleteProperty` 自己认数字下标键（`ArrayIndexAt`），
  // 而 `"1"` 与 `1` 在它眼里是同一格——归一之后行为不变，变的只有「对象键不再抛」。
  // **符号键原样**（身份，不许字符串化——与 `in` / `get_index` / `set_index` 同一句）。
  const rawDelKey = slots[base + 1];
  const delKey = rawDelKey.Tag === ValueTag.Symbol
    ? rawDelKey
    : RtToString(this.Room(), this.Table, rawDelKey);
  return Value.FromBool(DeleteProperty(this.Table, slots[base].Ref, delKey));
}
if (id === RtOp.GetIndex) {
  RequireArgc(argc, 2, "get_index");
  const indexReceiver = slots[base];
  // **空值的下标读要抛**（第 136 轮）：JS 里 \`null[0]\` 是 \`TypeError\`——
  // 与 \`GetProperty\` 那条同一个道理。
  if (indexReceiver.Tag === ValueTag.Undefined || indexReceiver.Tag === ValueTag.Null) {
    const what = indexReceiver.Tag === ValueTag.Null ? "null" : "undefined";
    return this.Guard(() => {
      throw new Error("cannot read properties of " + what);
    }, ErrorKindType);
  }
  // **键统一「字符串化 + 判下标」**（第 190 / 191 轮）——**一条判据管住所有接收者**：
  //   · 数字键 \`s[0]\` 与「全是数字的字符串键」\`s["0"]\` / \`arr["0"]\` → **下标**；
  //   · 小数 \`s[1.0]\` → \`"1"\` 下标；\`s[1.5]\` → \`"1.5"\` **不是下标** → 属性；
  //   · 别的键（\`s["length"]\` / \`arr["map"]\` / \`o["k"]\`）→ **属性**那条路。
  // **符号键原样**（属性查找按 \`Id\` 比，字符串化会与同名的字符串键撞上——**静默错值**）。
  const rawIndexKey = slots[base + 1];
  // **键归一走 `PropertyKeyOf`**（第 750 轮）：符号原样、其余 `ToString`，
  // **对象那一档先 `ToPrimitive`**（原来对象落进 `RtToString` ⇒ 响亮地抛 ⇒
  // 整份文件跑不起来；JS 里 `t[new Set()]` 给 `"[object Set]"`）。
  //
  // **`null` = 那个 `toString` 里抛了、控制流已经交给处理点**（见 `PropertyKeyOf`）：
  // 这一格**不许再往下走**（`DoThrow` 已经安排好了）。
  // **交回的是一个值、不是一个裸 `return`**：这个算子的返回类型是 `Value`
  //（`tsc` 当场报 `Type 'undefined' is not assignable to type 'Value'`，
  //  第 750 轮实测踩到），而**它不会被写进结果格**——引擎每一趟在写之前都看
  // `Status`，`DoThrow` 已经把它置成 `Threw` 了（`Guard` 那条路同一个形状）。
  const indexKeyText: Value | null = this.PropertyKeyOf(rawIndexKey);
  if (indexKeyText === null) return Value.Undefined();
  const indexAt = ArrayIndexAt(this.Table, indexKeyText);
  // **数组与字符串**：下标那一档走 \`GetIndex\`（数组给元素、字符串给**一个码元**），
  // 其余走属性（数组的方法 / 字符串的 \`length\` 与原型）。
  // **原来这两支都是「无条件转给 \`props.GetIndex\`」**：它只认数字键，
  // 于是 \`s["length"]\` / \`arr["map"]\` 全抛
  // \`unimplemented: non-numeric index needs ToString\`（**整份文件进不来**，实测）。
  if (indexReceiver.Tag === ValueTag.Array || indexReceiver.Tag === ValueTag.String) {
    const shapeProtoTable = this.Protos;
    if (shapeProtoTable === null) throw new Error("no prototype table");
    if (indexAt >= 0) {
      // **下标位上装了访问器就改走 `GetProperty`**（第 746 轮）：数组的元素住在独立一段、
      // 访问器只能住在属性表里，而装访问器那一处**把那一格摘成了洞** ⇒
      // 快路径「先看元素区」会读到一个洞、给 `undefined`。
      // 判据是 `IndexAccessorAt`（`props.xl.md`）——它只答「是不是访问器」，
      // 值 / getter 的调用由 `GetProperty` 那一份**唯一的**读属性实现负责
      //（`this` 是接收者、getter 要重入，这两件事只有那一条路有通道）。
      if (IndexAccessorAt(this.Table, indexReceiver, indexAt)) {
        return this.Guard(() => GetProperty(this.Room(), this.Native(), shapeProtoTable, this.Table,
          indexReceiver, indexKeyText));
      }
      return GetIndex(this.Table, indexReceiver, Value.FromInt(indexAt));
    }
    return this.Guard(() => GetProperty(this.Room(), this.Native(), shapeProtoTable, this.Table,
      indexReceiver, indexKeyText));
  }
  // **数字 / 布尔这些原始值也走属性**（第 777 轮）：JS 里 \`(5)["toFixed"]\` 与 \`(5).toFixed\`
  // **是同一件事**（先 \`ToObject\` 再沿原型找），本仓原来是「不是对象就给 \`undefined\`」⇒
  // \`n["toFixed"] === Number.prototype.toFixed\` 给**假**（判据 \`p750a-a04\` 第 5 行：
  // Node 给 \`true\`、本仓给 \`false\`——**静默错值**，读起来像「那个方法不存在」）。
  // **点号那一路（\`RtOp.GetProp\`）一直是好的**：它无条件交给 \`GetProperty\`，
  // 而 \`GetProperty\` 自己会装箱（\`(5).toFixed\` / \`true.toString()\` 都对）——
  // 这一支的早退是**它自己多出来的一句**，与那一份实现漂了。
  // **符号不在这一档**：它连属性表都没有（\`description\` / \`toString\` 那两格由
  // \`RtOp.GetProp\` 特判，见上面「符号不是对象」那一段）——照搬过来只会给 \`undefined\`，
  // 所以符号照旧早退，与今天一字不差。
  if (!indexReceiver.IsObject() && indexReceiver.Tag === ValueTag.Symbol) return Value.Undefined();
  const indexProtoTable = this.Protos;
  if (indexProtoTable === null) throw new Error("no prototype table");
  return this.Guard(() => GetProperty(this.Room(), this.Native(), indexProtoTable, this.Table,
    indexReceiver, indexKeyText));
}
if (id === RtOp.SetIndex) {
  RequireArgc(argc, 3, "set_index");
  const indexTarget = slots[base];
  // **键统一「字符串化 + 判下标」** —— 与上面 `get_index` **一字不差**（第 305 轮）。
  //
  // **原来数组那一支把键原样递下去**：`props.SetIndex` 只认数字键，于是
  // `a["1"] = 20` 报 `unimplemented: non-numeric index needs ToString`
  //（**整份文件进不来**）——而同一个键**读**是好的（`get_index` 第 190 / 191 轮
  // 就统一过了），所以「读得到、写不了」这一半一直没被问过。
  // 两档都要认（与 `delete` 那一支同一条理由）：`xs[1]` 的键是**数字**、
  // `xs["1"]` 的键是**文本**，而「`"1"` 是不是下标」这件事只有 `ArrayIndexAt` 有答案
  //（它写着前导零不算、超 `i32` 不算）——不在这里另写一份判据。
  // **符号键原样**（`o[sym] = v` 的键就是那个符号，字符串化会与同名的字符串键撞上）；
  // **对象键先 `ToPrimitive`**（第 750 轮，与 `get_index` 那一处**同一个落点**）。
  // 交回一个值而不是裸 `return` 的理由与上面那一处一字不差（返回类型是 `Value`）。
  const rawSetKey = slots[base + 1];
  const setKeyText: Value | null = this.PropertyKeyOf(rawSetKey);
  if (setKeyText === null) return Value.Undefined();
  const setAt = ArrayIndexAt(this.Table, setKeyText);
  const setValue = slots[base + 2];
  if (indexTarget.Tag === ValueTag.Array) {
    if (setAt >= 0) {
      return this.Guard(() => SetIndex(this.Room(), this.Table, indexTarget, Value.FromInt(setAt), setValue));
    }
    // **不是下标 ⇒ 走属性那条路**（`arr[1.5] = v` / `arr["x"] = v` /
    // `arr["length"] = 2`——JS 里那三格都是**属性**，不是元素）。
    // `props.SetProperty` 认得 `length` 那一格（截断），与 `arr.length = 2` 同一条。
    const arraySetProtoTable = this.Protos;
    if (arraySetProtoTable === null) throw new Error("no prototype table");
    // **非严格：写不下去也一声不响**（第 333 轮，与 `set_prop` 那一段同一条）。
    return this.Guard(() => {
      SetProperty(this.Room(), this.Native(), this.Table, indexTarget, setKeyText, setValue);
      return setValue;
    });
  }
  if (!indexTarget.IsObject()) {
    // **`null` / `undefined` 要先抛 `TypeError`**（第 772 轮）：与 `get_index`
    // （第 136 轮那一句）以及 `set_prop` / `del_prop` 那两处**同一句**——
    // `u[0] = 1`（`u` 是 `undefined` / `null`）在 JS 里是 `TypeError`，
    // 而**别的原始值**才是空操作。
    if (indexTarget.Tag === ValueTag.Undefined || indexTarget.Tag === ValueTag.Null) {
      const indexSetWhat = indexTarget.Tag === ValueTag.Null ? "null" : "undefined";
      return this.Guard(() => {
        throw new TypeError("cannot set properties of " + indexSetWhat);
      }, ErrorKindType);
    }
    // **非严格：给原始值写一格也一声不响**（第 342 轮，**实测撞到的**）：
    // `(s as any)[0] = "z"` 与 `(boxed as any)[0] = "q"`（第 333 / 342 轮那两条判据）
    // 在 JS 里**都是空操作**——字符串是不可变的、装箱对象那种写法也没有可写的元素格
    // （`new String("xy")` 那一条走的是对象那一支，落进 `SetProperty` 之后
    //  同样一声不响）。**原来在这里抛**，与 `set_prop`（第 333 轮）那条口径**相反**：
    // 那一处早就改成「写不下去也一声不响」了，而**下标这一条路是另一条**
    // ⇒ 同一件事两处口径不同（判据 `rt-string-index-write-ignored` 现场就是这个）。
    // **返回值照旧给那个值**（JS 的赋值表达式的值），只是**没有地方落**。
    return setValue;
  }
  const setProtoTable = this.Protos;
  if (setProtoTable === null) throw new Error("no prototype table");
  return this.Guard(() => {
    SetProperty(this.Room(), this.Native(), this.Table, indexTarget, setKeyText, setValue);
    return setValue;
  });
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
  // **这一支的两处抛也要能被接住**（第 127 轮）：`for (const x of 42)` 走到这里——
  // 判据现场先修了 `iter_next` 才发现真正抛的是**这一支**（两处都抛同样的话，
  // 只补一处等于没补）。所以整支包进 `Guard`。
  return this.Guard(() => {
    // **字符串也是可迭代物**（第 136 轮）：`for (const c of "ab")`。
    // **它必须排在那句 `IsObject` 之前**：字符串**不是对象**（`ValueTag.String`），
    // 排在后面就永远走不到——报的还是「iterating a non-object」。
    // 这一支与 `spread_into`（第 132 轮）**同一口径**：`[...'ab']` 早就通了。
    if (target.Tag === ValueTag.String) {
      return Value.FromObject(this.Table.CreateIterator(target.Ref));
    }
    if (!target.IsObject()) throw new TypeError("unimplemented: iterating a non-object");
    const item = this.Table.Get(target.Ref);
    if (item.Generator !== null) return target;
    if (target.Tag === ValueTag.Array) {
      return Value.FromObject(this.Table.CreateIterator(target.Ref));
    }
    // **不可迭代的东西抛的是 `TypeError`**（第 709 轮）：JS 里
    // `[...{ length: 2 }]` / `for (const x of 42)` 都是 `TypeError`，
    // 而这一层原来抛的是**普通 `Error`** ⇒ `catch (e) { if (e instanceof TypeError) }`
    // 那种写法分不出来（判据 `probe696-i08` / `probe705-i-c13` 钉的就是它）。
    // **抛宿主 `TypeError`**：`Guard`（`vm.xl.md`）按宿主异常的类折成 `ErrorKindType`
    // ——那是这一层唯一的翻译点，不另写一句 `MakeError`。
    throw new TypeError("unimplemented: iter_new on this kind of object");
  });
}
if (id === RtOp.IterNext) {
  RequireArgc(argc, 2, "iter_next");
  // **也要走 `Guard`**（第 127 轮）：`DoIterNext` 对「不可迭代的东西」会抛
  // （`for (const x of 42)`），而这一抛以前**冒出 `Run()`**——
  // 与 rt 层其它失败一样，现在由错误工厂抬成**脚本接得住**的异常。
  return this.Guard(() => this.DoIterNext(slots[base], slots[base + 1], false));
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
  // **「这一次内建出没出事」要在这一趟里量**（第 300 轮）——`CallFailed` 那两格是
  // **重入**的账本（`CallNative` 每趟开头清 `NativeEscaped`、收尾把
  // 「`Throws` 变了」并进 `NativeFailed`），而**能力调用这一条路不经过 `CallNative`**
  // ⇒ 那两格**没人按趟归零** ⇒ 一次**早就被处理掉**的展开会把 `NativeEscaped` 留在**真**上，
  // 于是**后面每一次**问 `failed()` 的内建都以为「上一次重入没跑完」。
  //
  // **实测的现场**（判据 `e2e-mixed-everything`）：一个「同步就抛出」的 async 被调用之后，
  // 同一个片段里 `[...g()]` 与 `[...\"ab\"]` 都拿到**空数组**——
  // `SpreadInto` 里 `drain` 明明收齐了 2 项（实测打印），紧接着那句
  // `if (failed()) return Value.Undefined();` 把它**整批丢掉**：
  // 落回调用方的 `undefined` 被写进临时槽、而那个数组**留在原地空着**
  // ⇒ 脚本看到的是 `[]`——**一句异常都没有**、退出码还是 0。
  // **哪些地方看着「没问题」**：`Array.from` 那一条**不问 `failed()`**、
  // `[...[1,2]]` 走的是**数组那一支**（也不问）——所以红的只有
  // 「**展开一个生成器 / 一个字符串**」这两格（同一种病两种症状）。
  //
  // **做法**：把内建这一次调用**当成一趟**来记账（与 `CallNative` 一字不差）——
  // 进来清零、出去把「`Throws` 变过 / `NativeEscaped`」并进 `NativeFailed`，
  // 而**外层**那两格照旧保留（里面那一趟的结论**不能**把外面那一趟的账抹掉）。
  const escapedBefore = this.NativeEscaped;
  const failedBefore = this.NativeFailed;
  const thrownBefore = this.Throws;
  this.NativeEscaped = false;
  this.NativeFailed = false;
  // **第五格：`host_call` 那条路上没有实例**（第 617 轮）——
  // 它不是从 `DoNew` 进来的（`HostConstructing` 在这里恒为假），
  // 所以照「没有实例」交 `undefined`（与 `HostConstructThis` 的默认值一致）。
  const produced = invoker(target, Value.Undefined(), args, this.Room(), Value.Undefined());
  this.NativeFailed = this.NativeFailed || this.Throws !== thrownBefore || this.NativeEscaped;
  this.NativeEscaped = this.NativeEscaped || escapedBefore;
  this.NativeFailed = this.NativeFailed || failedBefore;
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
if (id === RtOp.ToNumber) {
  // **那个内建 `Number` 与一元 `+x` 走同一条路**（第 198 轮）：两个算子的语义**就是同一个**
  // `ToNumber`（JS 里 `+x` 与把值交给 `Number` 只在「有没有 `.call` 那点差别」上有区别，
  // 对一个表达式而言逐字相同）——所以这里**只留一个落点**，
  // `Number` 那个内建也转调它（`globals.xl.md` 的 `NumberFromValue`）。
  //
  // **它为什么排在 `ToString` 旁边**：`ir.xl.md` 把这两个算子一起放在
  // 「要碰堆的那两格」里（字符串解析 / 渲染都要读堆）——
  // 而 `ToNumber` 比它写着的还要重一点：对象那一支要 **`ToPrimitive`**，
  // 于是 `room` / `call` / `protos` 三样都要（与 `add` 那一族同一条理由）。
  RequireArgc(argc, 1, "to_number");
  const toNumberProtos = this.Protos;
  if (toNumberProtos === null) throw new Error("no prototype table");
  return this.Guard(() => MakeNumber(ToNumberOf(this.Room(), this.Native(), toNumberProtos, this.Table, slots[base])));
}
if (id === RtOp.Typeof) {
  RequireArgc(argc, 1, "typeof");
  // **原型表也交出去**（第 228 轮）：`typeof Function.prototype` 要认那两个原型对象
  //（它们是普通对象，只有 `protos` 认得出）——见 `RtTypeOf` 那一段。
  // **它是第四个实参、而且可省**：判据直接调这一条时不用改（那边是三个实参）。
  return this.Guard(() => RtTypeOf(this.Room(), this.Table, slots[base], this.Protos));
}
if (id === RtOp.In) {
  RequireArgc(argc, 2, "in");
  // **整支包进 `Guard`**（第 713 轮，**实测撞到的**）：这一支现在会抛
  // **宿主 `TypeError`**（右操作数不是对象那一档，见下面那一句），
  // 而 rt 层的裸抛**从 `Run()` 直接冒出去**——脚本的 `try { … } catch { … }`
  // **接不住**（`Guard` 那一段写着这条边界：第 125 轮 `a + b` 量过同一件事）。
  // 症状很好认：脚本前面几行照常打印、`catch` 一次都不进、tsrun 退出码 1、
  // 出错那句话与「还没实现的构造或语言层错误」一起印出来
  //（判据 `exec/expressions/180-in-operator` 第一版就是这个形状）。
  // **`Guard` 把宿主异常的类翻成 `ErrorKindType`**（它自己的那一句），
  // 语言层再翻成脚本里的 `TypeError`——一处翻译点，与 `iter_new` / `iter_next` 一字不差。
  return this.Guard(() => {
    const inReceiver = slots[base + 1];
    if (!inReceiver.IsObject()) {
      // **抛的是 `TypeError`，而不是普通 `Error`**（第 713 轮）：
      // JS 里 `"a" in 1` 是 **`TypeError`**（规范 `RelationalExpression : RelationalExpression in ShiftExpression`
      // 那条 `Type` 判据），脚本里 `try { "a" in (1 as any) } catch (e) { e.constructor.name }`
      // 接得住、给 `"TypeError"`。本仓原来抛普通 `Error` ⇒ 那一格给 `"Error"`。
      // **话里不带 `unimplemented`**：这不是「还没做」，是**查到的东西不对**。
      throw new TypeError("'in' needs an object on the right");
    }
    // **键先字符串化**（第 123 轮；与 `get_index` / `set_index` 同一套）：
    // JS 的 `in` 也走 ToPropertyKey——少了这一步，`1 in arr` 会往上抛
    // 「property keys must be strings or symbols」（判据现场就是这么红的）。
    // **符号键原样**（身份，不许字符串化）。
    const rawInKey = slots[base];
    const inKey = rawInKey.Tag === ValueTag.Symbol
      ? rawInKey
      : RtToString(this.Room(), this.Table, rawInKey);
    // **数组的下标键按「格子」答**：元素不在 `Props` 里，
    // 只看属性表会把 `1 in [10, 20]` 答成**假**（JS 给真）——**静默给错值比抛更坏**。
    // **洞不算**（`1 in [1, , 3]` 在 JS 里是假）。
    if (inReceiver.Tag === ValueTag.Array) {
      // **`"length"` 是数组的结构属性**（与 `GetProperty` 那一支同一条口径）——
      // 它不在 `Props` 里，不问这一句就会把 `'length' in arr` 答成**假**（JS 给真）。
      if (IsLengthKey(this.Table, inKey)) return Value.FromBool(true);
      const at = ArrayIndexAt(this.Table, inKey);
      if (at >= 0) {
        // **属性表里那一份要先看**（第 746 轮）——这一句是**次序**，不是优化：
        // 下标位上装了访问器时（`Object.defineProperty(a, 1, { get() { … } })`）
        // 元素区那一格已经被摘成洞，而**属性表里那一份才是那个属性**：
        // 先看元素区就会把 `1 in a` 答成**假**（JS 给真，判据 `p746b-b01`）。
        // **数据属性的影子也一样**（第 721 轮那一族）：两摞都有的时候以属性表为准——
        // 本仓的纪律一直是「属性表是标志位与访问器的家」（`IndexKeyShadowOf` 那一段）。
        if (HasProperty(this.Table, inReceiver.Ref, inKey)) return Value.FromBool(true);
        const array = this.Table.Get(inReceiver.Ref).AsArray();
        return Value.FromBool(at < array.GetLength() && !array.IsHole(at));
      }
    }
    return Value.FromBool(HasProperty(this.Table, inReceiver.Ref, inKey));
  });
}
throw new Error("unimplemented: rt op " + RtOpName(id));
```

## method Settler:()=>TaskSettler

**把这台机器包成「结清一个承诺」的回调**（第 186 轮）——与 `Scheduler()` 同一条理由
（语言层不该认识 `Vm`），**也同样是包一层箭头函数**（方法引用会丢 `this`，
第 185 轮实测过）。

```ts
return (promise: Value, value: Value, rejected: boolean): void => {
  if (rejected) {
    this.RejectPromise(promise, value);
  } else {
    this.ResolvePromise(promise, value);
  }
};
```

## method Scheduler:()=>TaskScheduler

**把这台机器包成语义层要的那个「挂一个原生任务」的回调**（第 185 轮）。

**为什么是第二处适配**：`props.xl.md` / 语言层不该认识 `Vm`，而 `Vm` 认识它们
——与 `Native()`（`NativeCall`）和 `Room()`（`RoomChecker`）同一条理由。

**建库层拿到的是「一个函数值」**，于是它**不必**知道任务表长什么样：
它只说「源承诺、回调、实参、结果承诺、认哪一档」五样（见 `ScheduleTask`）。

**必须包一层匿名函数，不能直接 `return this.ScheduleTask`**（第 185 轮实测）：
方法引用**不带接收者**——到了建库层手里，调它时 `this` 是 `undefined`，
报的是 `Cannot read properties of undefined (reading 'Table')`
（那句话离现场很远：它听起来像执行器没造好，其实是「方法跑丢了 `this`」）。
`Native()` 那一条一直是包着的（`this.CallNative(...)`）——这一条照它写。

```ts
return (promise: Value, callback: Value, args: Value[], result: Value, wants: number,
  carry: boolean, onRejected: Value): void => {
  this.ScheduleTask(promise, callback, args, result, wants, carry, onRejected);
};
```

## method Native:()=>NativeCall

把这台机器包成语义层要的那个回调（`props.xl.md` 的 `NativeCall`）。

**这是第二处适配**（第一处是 `Room`）：rt / props 不该认识 `Vm`，而 `Vm` 认识它们。

```ts
return (callee: Value, thisValue: Value, args: Value[]) =>
  this.CallNative(callee, thisValue, args);
```

## method CallFailed:()=>bool

**上一次重入是不是「没跑完」**（第 228 轮）——语言内建每一轮回调之后问它一句，
真就**立刻收摊**。

**这一格回答的正是台账里那条老账**（`exc-throw-in-callback`，第 219 / 220 / 222 轮
量了三遍）：**回调里抛了异常，内建的循环还在转**——因为内建是**宿主的 JS 循环**
（`Array.prototype.forEach` 那一族），而它拿到的是一个**看起来正常的** `undefined`
（`CallNative` 在状态被改之后就是给 `undefined`）。

**为什么不是一个「把异常抛给内建」的机制**：那条路第 153 轮试过
（「从内建里抛宿主异常出去」+ 把整条调用包进 `Guard`，判据当场红三条）。
**这是一条纯查询**：不问不改，两个问题各归各的——
「引擎要不要停」由引擎的状态答，「内建要不要收摊」由内建自己决定。

**判据有三半，缺一不可**（第二、三半都是第 228 轮实测**逼出来**的）：

1. **状态不在 `Ready` / `Halted`**（`Threw`、`OutOfMemory`、`OutOfSteps`）；
2. **`NativeFailed`**——「**上一次重入里出过事**」（重入里抛过，或者展开跨过了它的边界）；
3. **`NativeEscaped`**——「展开**跨过了重入那一段的边界**」。

**为什么光看状态不够**（实测的现场）：`[1,2,3].forEach(v => { if (v === 2) throw })`
里那个箭头函数跑在**重入帧**上，而 `try` 的**处理点在更外面那一帧**——
`DoThrow` 于是**展开到处理点**（`DoThrow` 那一段），
`RunToDepth` 醒过来看见的是**正常的 `depth` 边界**，于是**把状态留在 `Ready`**。
外面那一段循环看到的是一次「正常返回」，接着转下一圈——**状态判据在那一档上完全看不见**。

**第二半为什么是「这一次」而不是一个布尔标志**（第一版就是布尔标志，**实测当场变红**）：
`try { throw … } catch { … }` 里那一抛**已经被脚本处理掉了**——脚本接着往下跑，
而它后面每一次 `map` / `forEach` 都会读到一个**没被清掉的「真」**
（现场：`Object.entries(…).map(…)` 返回 `undefined`，于是 `.join` 报
`cannot read properties of undefined`——**离现场很远**）。
**所以记的是「计数」**：`CallNative` 在**压帧之前**记下 `Throws`、**醒来之后**比一次——
变了就是这一次出的；上一次已经处理掉的那些**不在这两个数之间**。
**为什么不在这里清那个标志**：读它的**不止一处**
（`forEach` 与外面那一层 `Array.from` 可能都在问）——清一次会把**外面那一层**骗过去
（它问到的永远是「假」，于是照旧多跑）。

**第三半为什么还要单独一格**（第二版只比计数，**又当场变红**）：
回调**不一定走 `CallNative`**——语言内建**直接调**闭包时走的是 `DoCallValue`
（压帧 + 分派循环），那条路上 `Throws` **一个数都没变**。
现场：`[3,1,2].sort((a,b) => { if (…) throw })` 写在一次**已经接住过异常**的 `catch` 之后
（`Throws` 在那一抛里已经加过一）⇒ 计数没变 ⇒ `sort` 照旧把剩下的比较跑完
（判据 `exc-throw-in-callback-map-filter`）。
**「跨过边界」只有层深说得清**：处理点的层深 **≤** 这一趟的起点层深
（`HandlerEntry.Depth` / `NativeBoundary`）——帧句柄只答得了「那一帧还在不在栈上」。

**`Halted` 不算失败**（第 185 轮的口径）：微任务是在**入口函数返回之后**排空的，
那一刻状态正是 `Halted`——把 `Halted` 算成失败的话，`.then(f)` 里 `f` 的返回值
会被当成「出事了」。

**为什么不能靠「返回值」传这件事**：`undefined` 是**合法的回调返回值**
（`[1, 2].forEach(() => {})` 每次都返回它），拿它当哨兵就是把正常情况当成异常。

```ts
return this.NativeFailed || this.NativeEscaped
  || (this.Status !== VmStatus.Ready && this.Status !== VmStatus.Halted);
```

## method CallNative:(callee:Value, thisValue:Value, args:Array<Value>)=>Value

**重入分派循环**调一个脚本函数，拿它的返回值。访问器（getter / setter）与内建方法
（`Array.prototype.map` 那种）只有这一条路。

三件事值得记住：

1. **深度上限**（`MaxNativeDepth`）：脚本可以在 getter 里再读同一个属性；没有上限就是
   栈溢出的另一种写法；
2. **结果走 `NativeReturnSlot`**：重入时没有「调用者的槽」，所以结果进 `NativeResult`；
3. **回来时状态可能已经被改**（脚本抛了、预算用尽）：那种情况下返回 `undefined`——
   **rt 算子那一类调用方的结果会被丢掉，因为控制流已经不在那条指令上了**
   （展开把 `Pc` 改成了处理点）。这条推理让「重入期间出事」**在那一类调用方上**不需要额外清理。

   **但它只对 rt 算子成立，对语言内建不成立**（第 222 轮量到）：
   rt 算子是一条指令——状态一变，`Pc` 已经指向处理点，返回值扔了就行。
   而**语言内建是宿主的 JS 循环**（`Array.prototype.forEach` / `map` / 谓词族 / `sort` 的比较器，
   都在 `typescript-exec/builtins/` 里）：它**不知道**状态已经变了，拿到 `undefined` 会当成
   「回调的返回值」接着转下一圈——于是**回调抛出之后循环照跑**，异常等内建返回时才冒出来
   （`[1,2,3].forEach(v => { if (v===2) throw })` 在 node 里是 `v1,v2,caught`、这里是 `v1,v2,v3,caught`；
   判据 `exc-throw-in-callback`，台账里那一格写着范围与修法）。

   **修法要往「幂等」那条路上走**：让内建**立刻停**，而停的办法**不能**是
   「从内建里抛一个宿主异常出去」——那条路第 153 轮试过（把整条调用包进 `Guard`），
   判据当场红三条（构造函数 / 宿主函数里抛的错也一并变成脚本异常）。
   要的是「**把状态里已经记录的那一份原样交出去、不抬第二次**」。

   **第 228 轮做掉了**，而且**一行内建的循环都没有改**：加的是这一层的一个**查询**
   （`CallFailed`，就在下面），内建在每一轮回调之后问它一句、真就收摊。
   **让内建来问、而不是让引擎去猜**：引擎**无从知道**「调用我的那个循环想不想停」
   （它只看见一次普通的重入调用），而内建**知道自己在循环**。

**可调用对象走同一条**（第 145 轮）：`[1, 2].map(String)` 的 `String` 是**对象**，
所以这一支不压帧、也没有生成器那回事——直接交给 `CallHostValue`
（与 `DoCallValue` 那份**同一处**）。

```ts
// **可调用对象也要能当回调**（第 145 轮）：`[1, 2].map(String)` 里那个 `String`
// 是一个**对象**——建库层现在把这种值交进来了（`IsCallableValue`），
// 所以这一层要接得住。三条路（调用 / 构造 / 重入）走的是**同一个** `CallHostValue`。
//
// **`this` 给「那个对象自己」**（第 228 轮改）——原来给的是**调用方那一格**
// （`[1, 2].map(String)` 这条重入路上它是 `undefined`，`DoCallValue` 那条路上是接收者）。
// **为什么非改不可**：`bind` 造出来的那个函数是一个**通知对象**
// （`AttachCallable` 挂一格载荷，三样东西藏在它自己的隐藏属性里），
// 而它**只有拿到自己**才读得到那三样——传调用方的接收者，它读的就是**别人的**属性
// （症状正是「a bound function lost its target」，或者更坏：**读到了别人的绑定**）。
// **给「对象自己」对原有的那几格没有影响**：`String(x)` / `Array(n)` / `Symbol(…)` / `Date(…)`
// 都是**按能力号分派**的，它们的实现**一个字节都不看 `this`**
// （`globals.xl.md` 的 `InvokeGlobal` 里那几支）——所以这一改只多给了一条信息。
//
// **生成器的 `next` 也要在这里截下来**（第 229 轮）：它是**同一个载荷**，
// 而这一条路是**回调**那一侧（`xs.map(it.next)` 这种把方法当值传出去的写法）——
// 判据与 `DoCallValue` 那一条**共用 `GeneratorStepKind`**（写两遍就是两处会漂）。
if (this.GeneratorStepKind(callee) !== 0) {
  // **第一个实参要送进挂起点**（第 312 轮）——与 `DoCallValue` 那一处**同一条口径**
  //（那边从槽里取、这边从实参表取，两处的「第 0 个」是同一件事）。
  const sentByCaller = args.length > 0 ? args[0] : Value.Undefined();
  const stepKind = this.GeneratorStepKind(callee);
  // **`return()` 这一档在 `DoCallValue` 里做掉了、这里却漏了**（第 746 轮）——
  // 而**方法调用走的正是这一条路**（`it.return(9)` 是 `DoCallMethod` → 这里；
  // `DoCallValue` 那一支给的是「生成器方法**被当值取出来再调**」`const r = it.return; r.call(it, 9)`）。
  // 原来这一格**响亮地抛**（"generator return() needs the finally chain"），
  // 而那一句是第 313 轮的说法——第 336 轮把 `return()` 做掉之后**没有跟着改这一处**，
  // 于是第 336 轮之后这里变成了**另一句话**：
  // 抛的那一句被删掉之后，`stepKind === 2` 直接落到下面那句 `NextStepOf(…, false)`——
  // 也就是**把 `return(9)` 当成 `next(9)` 跑**：那个挂起的 `yield` 收到 `9`、
  // 生成器接着跑到**下一个 `yield`**，交出来的是下一项。
  // 症状是**静默错值**：`function* g() { yield 1; yield 2; }` 的 `it.return(9)` 给
  // `{value: 1, done: false}`（Node 给 `{value: 9, done: true}`），
  // 而 `it.return(9)` 之后再 `next()` 给 `{value: 2, done: false}`（Node 给 `{done: true}`）。
  // **判据 `runtime/round746/p746a-a02` 钉的就是它**。
  //
  // 修法与 `DoCallValue` 那一处**一字不差**（两处共用同一个 `NextStepOf` 的 `returns` 参数）：
  // 送的是**一次「完成」**而不是一个值，方向由 `returns = true` 分开
  //（`return` 只跑 `finally`、`catch` 不接——见 `ir.xl.md` 的 `CheckGeneratorReturn`）。
  if (stepKind === 2) {
    return this.NextStepOf(thisValue, sentByCaller, false, null, true);
  }
  return this.NextStepOf(thisValue, sentByCaller, stepKind === 3, null);
}
if (this.IsHostCallable(callee)) {
  // **执行器那两格（`resolve` / `reject`）也要在这一条路上截下来**（第 318 轮）——
  // 与生成器那三格**共用同一条口径**（`SettleCallbackKind`）。这一条是**回调**那一侧
  // （把 `resolve` 当值传出去的写法），两处各截一次
  //（只截一处就是「直接调可以、传出去不行」，第 312 轮踩过同一个形状）。
  const settleKind = this.SettleCallbackKind(callee);
  if (settleKind !== 0) {
    const payload = this.Table.Get(callee.Ref).Host;
    if (payload === null) throw new Error("a settle callback without a payload");
    const target = Value.FromObject(payload.Opaque);
    const first = args.length > 0 ? args[0] : Value.Undefined();
    if (settleKind === 1) {
      this.ResolvePromise(target, first);
    } else {
      this.RejectPromise(target, first);
    }
    return Value.Undefined();
  }
  // **`bind` 的对象那一档例外**（第 343 轮，**实测撞到的**）：见 `IsBoundCall`
  // 那一段的账——`super(m)` 是**带接收者**的调用，而接收者正是**在造的那个实例**，
  // 给「对象自己」就把它顶掉了。**为什么不能整个去掉这条规则**：`bind` 造出来的那个
  // 对象**只有拿到自己**才读得到那三样载荷（第 228 轮的账）。
  // **只有 `bind` 那一格给自己**（**第二轮实测撞到的**）：第一版还多带了一句
  // 「调用方没给接收者时也给对象自己」 ⇒ `Error("without new")` 拿到的
  // 是**那个构造函数对象**（`self` 是对象就写它、并把它交回去）
  // ⇒ `called instanceof Error` 从**真**变成**假**（判据 29 第 4 行：
  // 「error-call-new without new」那一格——**一句话里没有一个字提到 `Error` 对象**）。
  // **其余可调用对象一律照调用方给的**：它们**一个字节都不看 `this`**
  //（第 228 轮的注释里就是这么写的），所以给 `undefined` 与给对象自己是同一件事。
  // **与 `DoCallValue` 那一处一字不差**（第 617 轮）：见那一处的账——
  // `HostConstructing` 那一半是反的，`IsBoundCall` 已经排掉了 `super` 那一档。
  const boundCall = this.IsBoundCall(callee);
  const hostThis = boundCall ? callee : thisValue;
  const savedConstructThis = this.HostConstructThis;
  this.HostConstructThis = boundCall && this.HostConstructing ? thisValue : Value.Undefined();
  const produced = this.CallHostValue(callee, hostThis, args);
  this.HostConstructThis = savedConstructThis;
  if (produced === null) return Value.Undefined();
  return produced;
}
if (callee.Tag !== ValueTag.Closure) {
  // **「调的不是函数」今天还不能被脚本接住**（第 153 轮量准、**没做**）：
  // 这一抛是**引擎的**异常，会冒出 `Run()`——于是
  // `try { o.m() } catch {}` 进不去 `catch`（JS 是 `TypeError`，**可接住**）。
  //
  // **两条路都试过、都退回来了**，把结论留在这里：
  //   ① 「把整条调用包进 `Guard`」——判据当场红了**三条**：那样连
  //      **构造函数 / 宿主函数**里抛的错也变成脚本异常，而「引擎内部的失败照样冒出」
  //      是**故意**的（第 121 轮那条兜底判据钉着它）；
  //   ② 「只包 `Op.CallMethod` 那一条」——**完全不动**：`o.m?.()` 与 `o?.n?.()`
  //      降级出来的是 `Op.Call`（第 152 轮改成「先取方法值、再带 `this` 调」），
  //      而 `new` 那一族也在 `Op.Call` 上——两处**共用的正是同一条**。
  // **所以这件事的真问题是「失败要有类别」**（台账里那一条）：
  // 得让这一抛带上「是 `TypeError`」，由错误工厂按类别抬成脚本异常——
  // 那样「引擎内部的失败照样冒出」与「脚本接得住 `TypeError`」两件事才分得开。
  //
  // **第 246 轮：两处一起改**。**两个入口**：这一处（`CallNative`）管
  // `Op.Call`（`f(...)` 与 `(1 as any)()`——第 245 轮实测：真正接住
  // `(1 as any)()` 的正是**这一处**，不是 `DoCallValue`），
  // `DoCallValue` 那一处管 `Op.CallMethod` / `o?.m()` 那一族。
  //
  // **收尾按这一处自己的签名**（**先把签名抄在手边再落笔**）：
  // `## method CallNative:(…)=>Value` ⇒ **交 `Value.Undefined()`**；
  // 而 `DoCallValue:(…)=>void` ⇒ 那一处是**裸 `return`**。
  // **那个值到不了任何人手里**：`Guard` 已经把控制流交给处理点了
  //（与 `CallHostValue` 那条「展开已经发生 ⇒ 不许写结果槽」**同一个形状**）。
  this.Guard(() => {
    throw new TypeError("cannot call a non-closure value (it is not a function)");
  }, ErrorKindType);
  return Value.Undefined();
}
const closure = this.Table.Get(callee.Ref).AsClosure();
// **非严格那条兜底在这条路上也要走**（第 337 轮，与 `DoCallValue` 那一支**一字不差**）：
// 重入路的调用者（`Array.prototype.map`、访问器、`Symbol.iterator`）递进来的
// `this` 常常是 `undefined`（`[1,2].map(function () { return this })`）——
// 而 JS 的非严格规矩是**收全局对象**。**两条路各写一遍就会漂**
//（第 307 / 312 / 320 轮各踩过一次「同一个语义长在两条路上」），所以这里照抄那一句，
// 并在两处都留一行注释指向对方。
if (thisValue.IsUndefined() || thisValue.Tag === ValueTag.Null) {
  // **严格闭包不兜**（第 620 轮，与 `DoCallValue` 那一支一字不差）。
  if (!closure.IsStrict) {
    const globalProtos = this.Protos;
    if (globalProtos !== null && globalProtos.Global > 0) {
      thisValue = Value.FromObject(globalProtos.Global);
    }
  }
}
const info = FunctionAtEntry(this.Code(), closure.Code);
if (info === null) {
  throw new Error("closure points at no function: " + closure.Code);
}
// **生成器函数在这一条路上也要「只造对象、不跑体」**（第 307 轮修的）。
//
// **这一格原来是漏的**：`DoCallValue`（`Op.Call` / `Op.CallMethod` 那一族）**有**这一支，
// 而 `CallNative` 这一条**重入**路（访问器、内建回调、**迭代协议**）**没有**——
// 于是一个生成器函数**经重入被调**时，它按普通函数压帧跑 ⇒ 体里第一条 `suspend` 就报
// `suspend outside a generator`（那一帧的 `Generator` 是 0，见 `DoSuspend`）。
//
// **症状很会骗人**（实测）：`const it = a[Symbol.iterator](); it.next()` **全对**
//（那是脚本自己发的 `Op.CallMethod`，走 `DoCallValue`），
// 而 `[...a]` / `Array.from(a)` / `for (const v of a)` **全抛**
//（那三条都由引擎经 `call` 通道去调那个方法）。
// **同一条判据两种结局**，看起来像「展开坏了」，其实是**两条调用路少了一支**。
//
// **修法与 `DoCallValue` 那一支一字不差**：开一帧（但**不上栈**）、把实参铺进去、
// 包成生成器对象、把这**对象**交回去——体由 `next()` 推着跑（`DoIterNext`）。
// **它必须排在上面那几件重入记账之前**：这一趟**根本不进分派循环**
//（`NativeDepth` / `NativeResult` / 「这一趟出过事吗」都无从谈起），
// 排在后面会把一次「只是造个对象」的调用记成一次重入。
//
// **一处已知差写在明处**（与这一支的**非生成器**那一半同一条）：
// 这一条路铺实参**只按格数**铺——多传的那些落进「形参之后的格」，
// 而 `arguments` 与剩余参数两格由 `FillReentryArguments` 单独收
//（第 598 轮补上剩余参数那一半，见它那一处）。
if (info.IsGenerator) {
  if (!this.NeedRoom(ObjectCharge * 2 + info.SlotCount * ValueCharge
      + this.ReentryArgumentsCharge(info, args))) return Value.Undefined();
  const createdHandle = this.Table.CreateFrame(closure.Code, info.SlotCount, 0, -1);
  const created = this.Table.Get(createdHandle).AsFrame();
  created.Pc = closure.Code;
  created.Env = closure.Env;
  created.This = thisValue;
  for (let i = 0; i < args.length && i < info.SlotCount; i++) {
    created.Slots[i] = args[i];
  }
  this.FillReentryArguments(created, info, args);
  const generatorHandle = this.Table.CreateGenerator(createdHandle);
  created.Generator = generatorHandle;
  this.AttachGeneratorProto(generatorHandle, info.IsAsync);
  return Value.FromObject(generatorHandle);
}
if (this.NativeDepth >= MaxNativeDepth) {
  throw new Error("native re-entry is too deep: " + this.NativeDepth);
}
// **`async` 函数经重入调时也要给一个承诺**（第 320 轮）——与上面「生成器」那一支
// **同一个位置、同一条理由**：`DoCallValue` 里那条 `IsAsync` 分支（第 286 轮）
// **只长在调用路**，而**重入路**（`CallNative`：`Array.prototype.map` 那种回调、
// 访问器、内建方法）没有它 ⇒ 异步函数被当普通函数跑：
// 体里的 `await` 把这一帧摘下栈，而**调用者立刻拿到的**是 `NativeResult` 里那个
// **还没写过的空格** ⇒ 一个 `undefined`（**静默错值**）。
// **实测**：`[1,2].map(async (x) => { await null; return x * 10 })`
// 在 `Promise.all` 之后给 `[,]`（两个 `undefined`），Node 给 `10,20`；
// 而同一批「直接调」的（`for` 里 `g(n)` 走 `DoCallValue`）**是对的**
// ——**同一个语义长在两条路上**，这个形状第 307 / 312 / 313 / 318 轮各踩过一次。
//
// **先问房间、再造承诺**（第 286 轮那条教训）：反过来的话 `NeedRoom` 会在
// 分配中途才说不，而那时承诺已经造出来了（没人拿得到它 = 泄漏）。
if (info.IsAsync) {
  if (!this.NeedRoom(ObjectCharge * 2 + info.SlotCount * ValueCharge + ValueCharge
      + this.ReentryArgumentsCharge(info, args))) {
    return Value.Undefined();
  }
  const asyncPromise = this.MakeAsyncPromise(PromiseState.Pending, Value.Undefined());
  const asyncDepth = this.Frames.Depth();
  const asyncHandle = this.Frames.Push(closure.Code, info.SlotCount, NativeReturnSlot);
  const asyncFrame = this.Table.Get(asyncHandle).AsFrame();
  asyncFrame.Env = closure.Env;
  asyncFrame.This = thisValue;
  // **实参照上面那条铺**（同一份规矩：铺到帧的格数为止）。
  for (let i = 0; i < args.length && i < info.SlotCount; i++) {
    asyncFrame.Slots[i] = args[i];
  }
  this.FillReentryArguments(asyncFrame, info, args);
  // **承诺挂在帧上**：`DoReturn` / `DoThrow` 收尾时按它结清
  //（那两条路本来就是这么认人的，与 `DoCallValue` 那一支**同一处机关**）。
  asyncFrame.AsyncPromise = asyncPromise.Ref;
  // **跑起来**：跑到它第一次挂起（`await`）或者跑完——
  // **跑到挂起不是失败**：状态是 `Halted`（帧不在栈上了），上面那条
  // 「`Halted` 也算成功」的判据本来就是为这一类写的。
  this.RunToDepth(asyncDepth);
  return asyncPromise;
}
if (!this.NeedRoom(ObjectCharge + info.SlotCount * ValueCharge
    + this.ReentryArgumentsCharge(info, args))) return Value.Undefined();
const depth = this.Frames.Depth();
// **记下「这一趟开始之前」的两样**（第 228 轮）：
//   · `thrownBefore`——一共抛过几次（回来一比就知道**这一次**重入里出过事没有）；
//   · `escapedBefore`——上一趟有没有跨过边界（这一趟的判据要**重新算**，
//     不能继承上一次的结论：上一次要是跨过，后面每一次重入都会被判成「出事」）。
const thrownBefore = this.Throws;
// **还要记下外面那一摞帧**（第 331 轮）——见下面 `RunToDepth` 之后那一句的说明。
const outerFrames = this.Frames.Handles.slice(0, depth);
this.NativeEscaped = false;
this.NativeDepth = this.NativeDepth + 1;
this.NativeResult = new Value();
const handle = this.Frames.Push(closure.Code, info.SlotCount, NativeReturnSlot);
const frame = this.Table.Get(handle).AsFrame();
frame.Env = closure.Env;
frame.This = thisValue;
// **按实参表铺**（第 142 轮）：铺到帧的格数为止——多出来的丢掉
//（JS 也这样：多传的实参没有名字接，只是 `arguments` 看得见，而本仓没有它）。
for (let i = 0; i < args.length && i < info.SlotCount; i++) {
  frame.Slots[i] = args[i];
}
this.FillReentryArguments(frame, info, args);
this.RunToDepth(depth);
// **外面那一摞帧要放回来**（第 331 轮）——**这一条是实测逼出来的**。
//
// **它补的是什么**：`DoThrow` 的「一个处理点都不剩」那一支会 `Frames.Clear()`
//（那一支的理由是对的，见它的说明）——可**重入里的那一抛未必是「没人接」**：
// 语言层的内建**自己会接**。最日常的一格就是承诺执行器：
//
//     new Promise(() => { throw new Error("boom") }).catch(e => console.log(e.message));
//     console.log("after");
//
// Node 给 `after` + `boom`（那一抛在 JS 里**不是宿主错误**，是结果承诺被拒绝，
// 见 `TakeThrown` 那一格）；本仓**一行都不出**，宿主报
// `the script is waiting for a promise the host has not settled`——
// 看起来像运行器卡住，真相是**模块那一帧被一起清掉了**
// ⇒ 内建回来之后 `settle` 照做、可**没有帧接着跑**（`console.log("after")` 永远不会执行）。
//
// **判据是「整摞真的被清了」**（第 598 轮改）——**只有那一档才该放回来**：
// `DoThrow` 的两条出口对帧栈做的是**相反**的两件事——
//   · 「展开到外层处理点」：**故意**把这一段弹掉（控制流已经交给外面那个 `catch`），
//     放回来就是**把已经死掉的帧又压回栈上**；
//   · 「一个处理点都不剩」：`Frames.Clear()`，而那一抛由语言层的内建自己接
//     （上面那个承诺执行器），帧**必须**放回来。
// 原来只看「比 `depth` 浅」，于是前者也被当成后者——**只要重入不是从最外层发起的**
// （回调是被一个脚本函数调的）就必然踩到：处理点在模块那一层（层深 0）⇒
// `Frames.Depth()` 落在 1、`depth` 是 2 ⇒ 判据成立 ⇒ `walk` 那一帧被放回来
// ⇒ 它接着去读那个「已经作废的 `map` 结果」 ⇒ 外层的 `catch` **已经被那次展开用掉**
// ⇒ 真正冒到宿主的是**第二个**异常：`cannot read properties of undefined`
//（判据 `c374-ex-throw-in-reentrant-callback` / `c371-e2e-plugin-registry`
// ——后者报的 `cannot call a non-closure value` 是同一个根在另一处的长相）。
//
// **判据就是 `Status`**：那两条出口一个把状态**留着**（展开到处理点不着 `Threw`）、
// 一个**置成 `Threw`**——而这句话正好写在 `Frames.Clear()` 的下一行，
// 所以「`Status` 是 `Threw`」与「整摞被清了」在这里是**同一件事**（不必再开一格字段）。
// 外面那台循环一看到 `Threw` 就停，宿主照旧报错（**净效果一个字都没变**）。
if (this.Frames.Depth() < depth && this.Status === VmStatus.Threw) this.Frames.Handles = outerFrames;
this.NativeDepth = this.NativeDepth - 1;
// **「这一趟里出过事」有两个来源，缺一不可**（第 228 轮）：
//   · **计数变了** —— 重入里抛过（不管最后有没有被接住）；
//   · **`NativeEscaped`** —— 展开**跨过了这一趟的边界**，
//     它补的是「回调走 `DoCallValue` 而不是 `CallNative`」那条路
//     （`sort` 的比较器就是这样：`Throws` 一个数都没变，可这一趟整个被展开了）。
this.NativeFailed = this.Throws !== thrownBefore || this.NativeEscaped;
const result = this.NativeResult;
this.NativeResult = new Value();
// **`Halted` 也算成功**（第 185 轮）：微任务是在**入口函数返回之后**排空的
// （宿主调 `DrainMicrotasks` 的那一刻，状态正是 `Halted`）——
// 只认 `Ready` 的话，`.then(f)` 里 `f` 的返回值会被**丢掉**
// （实测：`Promise.resolve(7).then(v => v + 1).then(console.log)` 印的是 `undefined`，
// 而 Node 印 `8`）。生成器那一路（`DoIterNext`）要的是「**挂起**也算成功」，
// 判据在那里另写（它按生成器自己的状态判）——两条口径本来就不同。
if (this.Status !== VmStatus.Ready && this.Status !== VmStatus.Halted) return Value.Undefined();
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

## method DoIterNext:(iterator:Value, sent:Value, raises:bool = false, returns:bool = false)=>Value

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
  // **字符串的游标**（第 136 轮）：一次给一个**码点**（第 297 轮改的）。
  //
  // **第 136 轮那一版按「码元」拆**，理由写的是「与 `.length` / 下标 / `charAt` 同一条口径，
  // 单独让迭代按码点会让 `[...s]` 与 `for (const c of s)` 给的不一样」——**那个理由不成立**：
  // 这一支**就是** `[...s]` / `for..of` / `Array.from(s)` / 数组解构**共用的迭代器**
  //（`install.xl.md` 的 `GetIterator`），所以它们**天然一致**——按码点拆之后仍然一致。
  //
  // **JS 自己就是「两种口径」**（不是本仓要消灭的那种不一致）：
  // `"😀".length` 是 **2**（码元）、`"😀"[0]` 是**一个孤立代理**（码元），
  // 而 `for (const c of "😀")` **只给一个**（码点）。**两边本来就是两回事**，
  // 所以「`.length` 按码元」与「迭代按码点」**并不冲突**——原来那一版是把
  // 「同一个东西的两种视角」当成了「同一种东西的两种答案」，于是**与 JS 差一格**
  //（判据 `rt-surrogate-iteration` / `c291-rt-string-unicode-forms` /
  //  `string-charcodes-and-units` 三条一起量的就是它：`[...s].length` 给 4、
  //  Node 给 3——**一句异常都没有**）。
  //
  // **判据是「代理对」那一条**（JS 的 `StringIterator`）：这一格是**前导代理**
  //（`0xD800..0xDBFF`）而**下一格是后随代理**（`0xDC00..0xDFFF`）⇒ 一次给**两格**；
  // 其余（含**孤立代理**）一次给一格。**孤立代理要给出去**（不能吞掉）——
  // 吞掉的话 `[..."\uD800"]` 会变成空数组（JS 给一个长度 1 的数组）。
  if (source.Tag === ValueTag.String) {
    // **`TextUnitsOf` 收的是 `Value`**，而 `Get` 给的是**载荷**——
    // 所以要现包一个值出来（第一版直接递载荷，编译期就报
    // 「`HeapObject` 不能当 `Value`」，位置正好在这一行）。
    const units = TextUnitsOf(this.Table, Value.FromString(cursor.Source));
    const at = cursor.Index;
    if (at >= units.length) return this.MakeIterResult(Value.Undefined(), true);
    const unit = units[at];
    let take = 1;
    if (unit >= 55296 && unit <= 56319 && at + 1 < units.length) {
      const follower = units[at + 1];
      if (follower >= 56320 && follower <= 57343) take = 2;
    }
    cursor.Index = at + take;
    const piece: number[] = [unit];
    if (take === 2) piece.push(units[at + 1]);
    // **造字符串要先问房间**（与 `spread_into` 那条一字不差）——
    // 这一支也可能从**宿主**那条路进来（`it.next()`），所以自己包一层 `Guard`
    //（`MakeIterResult` 也是这么办的）。**计费按真实的码元数**（`take`，
    // 写死 1 会让代理对那一次**少问一格**）。
    return this.Guard(() => {
      if (!this.NeedRoom(ObjectCharge + CodeUnitCharge * take + ValueCharge)) {
        throw new Error("out of room");
      }
      return this.MakeIterResult(Value.FromString(this.Table.CreateString(piece)), false);
    });
  }
  if (source.Tag !== ValueTag.Array) {
    throw new Error("unimplemented: iterating a non-array source");
  }
  const array = source.AsArray();
  const at = cursor.Index;
  if (at >= array.GetLength()) return this.MakeIterResult(Value.Undefined(), true);
  cursor.Index = at + 1;
  // **下标位上装了访问器就改走 `GetProperty`**（第 769 轮）——与上面 `RtOp.GetIndex`
  // 那一处**同一句判据**（`IndexAccessorAt` + `GetProperty`，两处各写一遍就是两处会漂）。
  //
  // **为什么这一格也必须补**：`[...a]` / `for (const v of a)` / 数组解构**共用**的
  // 就是这一条引擎级迭代器（`install.xl.md` 的 `GetIterator` 对数组**原样返回**），
  // 而元素区里那一格**已经被摘成洞**（装访问器时摘的，见 `props.xl.md` 的
  // `IndexAccessorAt`）⇒ 快路径读到 `undefined`：`Object.defineProperty(a, 0,
  // { get() { return 7 } })` 之后 `[...a]` 在 Node 里是 `[7, …]`、本仓原来是
  // `[undefined, …]`（**静默错值**，判据 `runtime/round769/r769e-01` 第 10 行）。
  if (IndexAccessorAt(this.Table, Value.FromArray(cursor.Source), at)) {
    const shapeProtoTable = this.Protos;
    if (shapeProtoTable === null) throw new Error("no prototype table");
    // **接收者要包成 `Value`**（与字符串那一支同一条：`Table.Get` 给的是**载荷**，
    // 而 `IndexAccessorAt` / `GetProperty` 收的是值——第一版直接递载荷，`tsc` 当场报）。
    const sourceValue = Value.FromArray(cursor.Source);
    // **`Guard` 与 `MakeIterResult` 都要**：`GetProperty` 会调 getter（可能重入、可能抛），
    // 而这一支也可能从宿主那条路进来（`it.next()`）——两件事与字符串那一支同一个形状。
    return this.Guard(() => {
      const key = RtToString(this.Room(), this.Table, Value.FromInt(at));
      const produced = GetProperty(this.Room(), this.Native(), shapeProtoTable, this.Table, sourceValue, key);
      return this.MakeIterResult(produced, false);
    });
  }
  return this.MakeIterResult(array.GetAt(at), false);
}
if (item.Generator === null) {
  throw new Error("unimplemented: only generators and arrays can be iterated");
}
const generator = item.Generator;
if (generator.State === GeneratorState.Running) {
  throw new Error("unimplemented: this should throw a TypeError (generator is already running)");
}
if (generator.State === GeneratorState.Done) {
  // **已经结束的生成器不是黑洞**（第 746 轮）：`it.return(v)` 之后它记着那个完成值
  //（`HeapGenerator.CompletedValue`）——`next()` 那一档仍然给 `{value: undefined, done: true}`，
  // 只有 `return` 这一条路把完成值交回去（JS 的 `GeneratorResumeAbrupt` 对 `Done` 就是这一步）。
  if (returns) {
    generator.CompletedValue = sent;
    return this.MakeIterResult(sent, true);
  }
  return this.MakeIterResult(Value.Undefined(), true);
}
// **「还没开始过」那一档：`it.return(v)` / `it.throw(v)` 不许跑体**（第 746 轮）。
//
// JS 的生成器有一个**独立的** `suspendedStart` 状态（`%GeneratorState%` 的初值），
// 它与 `suspendedYield` **不是同一档**：体一次都没跑过时，
// `GeneratorResumeAbrupt` **不执行体、也不跑 `finally`**——直接把生成器关掉
// （`Done`），`throw` 把那个值**抛给调用方**、`return` 把它当**完成值**交出去。
// 本仓原来只有 `Suspended` / `Running` / `Done` 三档，**「还没开始」被记成了「挂起」**
// ⇒ 这一档落到下面那条正常恢复的路上：**体被跑起来了**。
// 症状是**静默错值**（判据 `runtime/round746/p746a-a01`）：
//   · `function* g() { yield 1; }` 的 `g().return(9)` 本仓给 `{value: 1, done: false}`
//     （Node 给 `{value: 9, done: true}`）——**第一次 `yield` 被当成产出交了出去**；
//   · 同一形状的 `g().throw(e)` 本仓给 `{value: 1, done: false}`（Node 把 `e` 抛给调用方）；
//   · 最要命的是**体的副作用跑了**：`function* g() { console.log("body"); yield 1; }` 的
//     `g().return(9)` 在 Node 里**一个字都不打**，本仓把那句 `console.log` 执行了。
//
// **判据是「有没有开始过」，不是「帧跑到哪了」**：`Started` 是生成器身上的一格
//（`heap.xl.md` 的 `HeapGenerator.Started`），`next()` 与「已经挂起之后的 return / throw」
// 都从下面那条路走（它们**该跑体**）。
if (!generator.Started && (raises || returns)) {
  generator.Started = true;
  generator.State = GeneratorState.Done;
  // **完成值记下来**（第 746 轮，见 `HeapGenerator.CompletedValue`）：
  // `it.return(v)` 打在**还没开始**的生成器上时，`v` 就是它的完成值——
  // 之后**再问一次**要给同一个答案（`it.return(8)` 两次都给 `{value: 8, done: true}`）。
  generator.CompletedValue = returns ? sent : Value.Undefined();
  if (raises) this.ThrowValue(sent);
  return this.MakeIterResult(generator.CompletedValue, true);
}
// **`next()` 这一档（以及「已经挂起之后的 return / throw」）要把这一格置真**：
// 下面那条路会**真的把体跑起来**，从这一刻起它就不再是「还没开始」了。
// **不能把这一句写在上面那个 `if` 之前**（**实测踩过一次**）：
// 那样第一次 `next()` 也会被那个 `if` 认成「没开始 + 有人叫停」——
// 症状是 `g().next()` 给 `{done: true}`（**体一次都没跑**，判据 `gen-basics` 当场红）。
generator.Started = true;
if (this.NativeDepth >= MaxNativeDepth) {
  throw new Error("native re-entry is too deep: " + this.NativeDepth);
}
const generatorFrame = this.Table.Get(generator.Frame).AsFrame();
generatorFrame.ResumeValue = sent;
// **「恢复时抛」这一格要一起交给那一帧**（第 313 轮）：它由 `Op.Resume` 读走并清掉
//（见 `ResumeRaises` 那一段）。**只有 `throw` 那一路会给真**。
// **第 330 轮它写在帧上**（原来是 `this.ResumeRaises`）：`RejectPromise` 是第二个写它的人，
// 而那里一次可能给**好几个**帧留下不同的答案 ⇒ 只能一帧一格。
generatorFrame.ResumeRaises = raises;
// **「这次恢复是一次 `return` 完成」也要交给那一帧**（第 336 轮）：
// 与上面那两格**同一个形状、同一个位置**——引擎把「有人叫停」带到挂起点，
// 而**跑 `finally` 链是降级层的事**（见 `Op.CheckGeneratorReturn` 那一段）。
// **它不能与 `raises` 合成一格**：`return` 要的**不是抛**——
// 抛出去的话 `catch` 会接住它（而 JS 的 `return` 只跑 `finally`、`catch` 不接）。
generatorFrame.GeneratorReturnRequested = returns;
generator.State = GeneratorState.Running;
const depth = this.Frames.Depth();
this.NativeDepth = this.NativeDepth + 1;
this.NativeResult = new Value();
this.Frames.PushExisting(generator.Frame, NativeReturnSlot);
this.RunToDepth(depth);
// **`await` 摘的挂起不是这一次的答案**（第 319 轮）——
// 异步生成器体里写 `yield await x`（或者 `await` 之后再 `yield`）时，
// 帧会在 `await` 上离开栈，而**这一帧还没有产出**。
// **判据是那一格 `SuspendedInAwait`**（`DoAwait` 写、`resume` 清）：
// 它答的是「上一次为什么离开栈」——`Awaiting` 答不了这个（恢复之后还留着）。
// **做法是把微任务排空**：那一趟会把这个帧恢复（`DrainMicrotasks` 的帧那一路），
// 它于是接着跑到**下一个 `yield`** 或者跑完；**又 await 了就再来一轮**（循环）。
//
// **为什么是同步地等**：JS 那边这是一条**承诺**（`next()` 给的），
// 而本仓的 `NextStepOf` 给的是 `{value, done}` 那一对——
// 语言层的 `await it.next()` **照样成立**（`await` 一个不是承诺的值就是它自己，
// 第 285 轮那条），`for await` 那一侧也一样。
// **边界写在明处**：`await` 一个**永远不结清**的承诺时，这里会**一直排下去**
//（JS 那边是挂住）——判据里没有这一格，先记在这里。
// **判据不能带 `State === Suspended`**（第一版就是这个错）：
// `generator.State` 在推进之前被置成 `Running`，而只有 **`suspend`（`yield`）**
// 会把它改回 `Suspended`——**`await` 摘下来的那一帧仍然是 `Running`**
// ⇒ 带上那一条判据，这个循环**一次都不进**（症状：改完什么都不变，实测就是这个）。
// 所以只问两件事：**还没结束**、以及**上一次离开栈是被 `await` 摘的**。
while (generator.State !== GeneratorState.Done
  && this.Table.Get(generator.Frame).AsFrame().SuspendedInAwait) {
  if (!this.DrainMicrotasks()) break;
}
this.NativeDepth = this.NativeDepth - 1;
const produced = this.NativeResult;
this.NativeResult = new Value();
// **不能按「状态是不是 Ready」判成败**：挂起会把栈清空，而运行循环的口径是
// 「没有帧了 = 停了」——那是**调用结束**的意思，可这里明明是**挂起**。
// 所以结局按**生成器自己的状态**判（Suspended 与 Done 都是正常结果）；
// 真出了事（抛了 / 越限）就**响亮地报出来**，而不是让调用方拿到一个 `undefined`
// 却以为「生成器产出的就是 undefined」。
// **生成器体里没接住的那一抛**（第 313 轮）——`it.throw(e)` 走到没有 `catch` 的那一层时
// 就是这个形状。JS 的规矩是**这个生成器就此结束**（此后 `next()` 恒给
// `{ value: undefined, done: true }`），而那个值要**抛给调用者**。
// **引擎这边没有「抛一个脚本值」的入口**——走的是**宿主请求脚本站内异常**那条路
//（`Raise`，与内建失败那条兜底**一模一样**）：宿主调用返回之后引擎把这次请求抬成
// 脚本异常，于是脚本里的 `try { it.throw(e) } catch (e2)` 接得住。
// **一处已知边界写在明处**：`DoThrow` 找的是**整个帧栈上最近的**处理点——
// 万一那一抛被 `it.throw()` 的**调用方**接住了，状态就不是 `Threw`、
// 这个生成器也就不会被标成 `Done`（判据里还没有这一格，先记在这里）。
// **状态要经一个局部量再比**：这一趟开头刚给它赋过 `Ready`（见 `DoIterNext` 那一段），
// TS 于是把这一格的类型收窄成 `Ready`——直接与 `Threw` 比会被它判成
// 「这两个类型没有重叠」（**编译期就报**，而那是**假报警**：`RunToDepth` 早就改过它了）。
const statusAfterStep: number = this.Status;
if (statusAfterStep === VmStatus.Threw) {
  generator.State = GeneratorState.Done;
  this.Raise(this.TakePending());
  return this.MakeIterResult(Value.Undefined(), true);
}
if (this.Status !== VmStatus.Ready && this.Status !== VmStatus.Halted) {
  throw new Error("the generator neither suspended nor finished (status " + this.Status + ")");
}
if (generator.State === GeneratorState.Suspended) return this.MakeIterResult(produced, false);
generator.State = GeneratorState.Done;
// **体自己跑完那一档也要记完成值**（第 746 轮）：`return "done"` 的生成器
// 第三次 `next()` 给的是 `"done"`，而 `it.return(9)` 在这一档上给 `9`
//（两次给同一个答案——与「还没开始」那一档一字不差）。
generator.CompletedValue = produced;
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

## method DrainIterator:(source:Value)=>Value

**把一个引擎认得的可迭代物走完，产出的值收成一个新数组**（第 199 轮）。

**认法照抄 `iter_new`**（三档、顺序也一样——字符串**不是**对象，
排在 `IsObject` 后面就永远走不到，那一条第 136 轮踩过）。
**于是「什么算可迭代物」在引擎里依旧只有那一处**（`iter_new` 与它并排）。

**为什么它必须住在引擎里**：走完一个生成器要发 `iter_next`，那是**指令**，
不是建库层能调的函数——这一条边界从第 132 轮起就写在 `SpreadInto` 那一段里。

**它自己把中间数组挂进根集**（这一轮的重点）：数组要跨过循环里每一次
`DoIterNext`（那会跑**脚本**、会分配、会触发回收），
而语言层造的中间数组**不在 `SnapshotRoots` 的名单里**——
不挂根的话，堆压满一次就把收进结果里的东西连同数组一起收走
（第 199 轮实测：6 万项的展开报 `invalid handle`）。
**挂上 / 摘掉都在这一趟里**（`Temps` 是短命的），出错时由 `Guard` 那条路照旧。

```ts
let iterator = source;
if (source.Tag === ValueTag.String) {
  iterator = Value.FromObject(this.Table.CreateIterator(source.Ref));
} else if (source.IsObject()) {
  const item = this.Table.Get(source.Ref);
  // **生成器就是它自己**（`iter_next` 对生成器直接推它）；数组要造一个游标。
  if (item.Generator === null) {
    if (source.Tag !== ValueTag.Array) {
      // **不可迭代的东西抛的是 `TypeError`**（第 709 轮）：`[...{ length: 2 }]` 在 JS 里
      // 是 `TypeError`，而这一层原来抛**普通 `Error`**（`Guard` 于是折成
      // `ErrorKindGeneric`）⇒ `catch (e) { e instanceof TypeError }` 分不出来。
      // 语言层的 `GetIterator` 对「其它值」**原样返回**，判据就落在这一句上
      //（`runtime/iterators/probe696-i08` / `probe705-i-c13`）。
      throw new TypeError("unimplemented: iterating a non-array source");
    }
    iterator = Value.FromObject(this.Table.CreateIterator(source.Ref));
  }
} else {
  throw new TypeError("unimplemented: iterating a non-object");
}
const protos = this.Protos;
if (protos === null) throw new Error("no prototype table");
return this.Guard(() => {
  const room = this.Room();
  if (!room(ObjectCharge)) throw new Error("out of room");
  const out = NewPlainArray(room, this.Table, protos);
  // **挂根**：从这一刻起，循环里任何一次回收都收不走它。
  this.Temps.push(out.Ref);
  const sent = Value.Undefined();
  while (true) {
    const step = this.DoIterNext(iterator, sent, false);
    // **`iter_next` 给的是 `[值, done]` 一对**（`MakeIterResult`）。
    const pair = this.Table.Get(step.Ref).AsArray();
    const produced = pair.GetAt(0);
    if (pair.GetAt(1).AsBool()) break;
    if (!room(ValueCharge)) throw new Error("out of room");
    // **每一趟都现取视图**（句柄稳定、**视图不稳定**，`map.xl.md` 文首那条教训）。
    this.Table.Get(out.Ref).AsArray().Push(produced);
  }
  // **摘根**：两头都在这一趟里（`Temps` 只在这一次调用期间有意义）。
  this.Temps.pop();
  return out;
});
```

## method IteratorDrainer:()=>IteratorDrain

**把这台机器包成语义层要的那个「走完迭代器」的服务**（第 199 轮）。

**为什么是第四处适配**：`install.xl.md` 那几块不该认识 `Vm`，而 `Vm` 认识它们
——与 `Native()`（`NativeCall`）、`Room()`（`RoomChecker`）、`Scheduler()`（`TaskScheduler`）
同一条理由。

**必须包一层箭头函数，不能直接 `return this.DrainIterator`**（第 185 轮实测过）：
方法引用**不带接收者**——到了建库层手里 `this` 是 `undefined`，
报的是 `Cannot read properties of undefined (reading 'Table')`（离现场很远）。

```ts
return (source: Value): Value => this.DrainIterator(source);
```

## method AttachGeneratorProto:(generatorHandle:int, isAsync:bool)=>void

**给刚造出来的生成器对象挂上那一格原型**（第 229 轮；第 320 轮分成两格）。

**为什么生成器需要原型**：它就是 `HeapObject` 上那一格 `Generator` 载荷
（**没有属性表**，`heap.xl.md`），所以 `it.next()` 里的 `next` 只能**沿原型链找**
（`props.xl.md` 的 `GetProperty`）。**之前那一格是空的** ⇒ `it.next()` 报
`calling a non-closure value`（听起来像调用写错了，其实是**那一格不存在**，
与第 150 轮 `(1.5).toFixed(2)` **同一个形状**）。

**收成一个方法**：造生成器的地方有**三处**（`DoCallValue` 的生成器分支、
宿主直调那一趟 `StartGenerator`、重入那条 `CallNative`）——写三遍就是三处会漂，
而漂了的表现是「从脚本里调 `g()` 拿到的能 `next`、从宿主调那一趟不行」（**一半对**，
这种最贵）。

**`async` 的要有自己那一格**（第 320 轮）：JS 里**同步**生成器**没有**
`Symbol.asyncIterator`（`for await (const x of syncGen)` 是 `TypeError`），
而**异步**生成器有。挂在同一格上的话，同步生成器会**自称可异步迭代**
——那是**说谎**（比缺一格更坏）。所以 `protos.AsyncGenerator` 单独一格、
由**调用方**告诉这一处「这个生成器是同步的还是异步的」（三处手里都有 `info.IsAsync`）。
**`AsyncGenerator` 那一格还没装时退回同步那一格**（不说谎，只是不特殊——
装不上是装载顺序的事，而退回去只少 `Symbol.asyncIterator`，不会把同步的说成异步的）。

**`Protos` 还没装时什么也不做**（与 `MakeClosure` 挂 `Function.prototype` 那一格
同一条纪律）。

```ts
const protos = this.Protos;
if (protos === null) return;
if (isAsync && protos.AsyncGenerator > 0) {
  this.Table.Get(generatorHandle).Proto = protos.AsyncGenerator;
  return;
}
if (protos.Generator <= 0) return;
this.Table.Get(generatorHandle).Proto = protos.Generator;
```

## method NextStepOf:(iterator:Value, sent:Value, raises:bool, keep:RootKeeper | null = null, returns:bool = false)=>Value

**走一步生成器，把结果包成脚本看得见的那一对 `{ value, done }`**（第 229 轮）。

**为什么这一层要管这个形状**：引擎的 `DoIterNext` 给的是**一对数组**
（`[产出值, 是否结束]`，`MakeIterResult`）——那是**降级层**在和它对接
（`iter_next` 那两条指令的约定，见 `DoIterNext` 那一段为什么这么定）。
而 `it.next()` 是**脚本**在问，JS 那边给的是**一个对象**——
「数组还是对象」这件事是**语言层**的约定，所以它落在这里而不是引擎里
（引擎只认「一个产出值 + 一个布尔」）。

**`done` 的判据用「跑完那一刻的状态」**（`DoIterNext` 返回之后再看一次）：
`Suspended` ⇒ 这一次是**产出**（`done: false`）；
`Finished` ⇒ 这一次是**结束**（`done: true`）
——`return "done"` 的生成器第三次调 `next()` 时，`value` 就是那个 `"done"`
（判据 `gen-basics` 钉着它：`it.next().value` 是 `"done"`、`.done` 是 `true`）。

**中途要把产出值挂根**（`keep`）：`DoIterNext` 会跑脚本、会分配、
一次回收就能把那个值收走（第 199 轮那类窗口）——**它是宿主侧的一个 `Value`**
（回收器看不见宿主的变量），所以挂根这一段是必须的。

```ts
// **推进一步**：`DoIterNext` 自己包了 `Guard`（见它那一段），这一层不必再包一遍。
const pair = this.DoIterNext(iterator, sent, raises, returns);
const cells = this.Table.Get(pair.Ref).AsArray();
const produced = cells.GetAt(0);
if (keep !== null) keep(produced, true);
// **状态是「跑完」还是「又挂起了」**：这一格决定 `done`（见上面那一段）。
// **判据取 `Done`**（`heap.xl.md` 的 `GeneratorState` 三档是 `Suspended` / `Running` / `Done`）：
// 跑完那一刻它在 `Done`，`yield` 挂起那一刻它在 `Suspended`。
const item = this.Table.Get(iterator.Ref);
const finished = item.Generator !== null && item.Generator.State === GeneratorState.Done;
const protos = this.Protos;
if (protos === null) throw new Error("no prototype table");
const answer = this.Guard(() => {
  const room = this.Room();
  if (!room(ObjectCharge * 2 + PropertyCharge * 2 + ValueCharge * 2)) {
    throw new Error("out of room");
  }
  const step = NewPlainObject(room, this.Table, protos);
  SetProperty(room, this.Native(), this.Table, step, Value.FromString(this.Table.CreateString(HostTextUnits("value"))), produced);
  SetProperty(room, this.Native(), this.Table, step, Value.FromString(this.Table.CreateString(HostTextUnits("done"))), Value.FromBool(finished));
  return step;
});
// **`async function*` 的 `next()` 给的是一格承诺**（第 754 轮，**普查当场量到的**）：
// 规范 §27.6 里 `%AsyncGeneratorPrototype%.next` 走的是
// **`AsyncGeneratorEnqueue`**——它把这一次推进的 `{ value, done }` **包成一个承诺**
// 再交出去（`await it.next()` / `for await` 那些写法要的正是那一格）。
//
// **本仓原来给的是裸的那一对**（`{ value, done }`），理由写在上面 `DoIterNext` 那一段
// （「`await` 一个不是承诺的值就是它自己」，所以**语言层的两条路照样成立**）——
// 那两句话对 `await` / `for await` 是对的，可是**脚本直接摸那一格**时就露出来了：
// `g().next().constructor.name` 在 Node 里是 `"Promise"`、本仓给 `"Object"`；
// `typeof g().next().then` 在 Node 里是 `"function"`、本仓给 `"undefined"`
// （判据 `p754d-03` / `p754d-04`——**静默错值**：`.then(…)` 那句报的是
// 「调了一个不是函数的东西」，听起来像脚本写错了）。
//
// **判据是「这个迭代器是不是异步生成器」**——原型链上有没有 `protos.AsyncGenerator`
// （它就是上面 `AttachGeneratorProto` 给异步那一档接的那一格，第 320 轮）。
// **用链不用等号**：`class G extends (async function* () {})` 那一档的实例
// 原型是自己的 `prototype`，等号会漏掉它——与 `ObjectTagOf` 里 `Error` 那一格
// （`RtChainHas`）同一条口径。
// **同步生成器一格都不动**（`protos.AsyncGenerator` 没装时也一格都不动）：
// `it.next()` 在 JS 里给的就是裸对象，包成承诺就是**把对的改错**。
const isAsyncGenerator: boolean = this.Table.Get(iterator.Ref).Generator !== null
  && protos.AsyncGenerator > 0 && RtChainHas(this.Table, iterator, protos.AsyncGenerator);
if (!isAsyncGenerator) return answer;
// 已兑现的承诺**照样让出一个 tick**（`MakeAsyncPromise` 与 `ResolveIntoPromise` 同一个口径）——
// JS 那边这一格本来就是「排进异步生成器的队列」，不是「当场结清」。
if (keep !== null) keep(produced, false);
return this.MakeAsyncPromise(PromiseState.Fulfilled, answer);
```

## method GeneratorNext:()=>NextStep

**把这台机器包成语义层要的那个「推进一步生成器」的服务**（第 229 轮）——
理由与 `IteratorDrainer()` 一字不差（第五处适配），
**也必须包一层箭头函数**（方法引用会丢 `this`，第 185 轮实测过）。

```ts
return (iterator: Value, sent: Value, keep: RootKeeper | null = null): Value =>
  this.NextStepOf(iterator, sent, false, keep);
```

## method RegisterThenableHook:(id:int)=>bool

**把「问一句：这个值是可采纳对象吗」那个能力号登记进能力表**（第 359 轮）——
由语言层在 `InstallBuiltins` 里调（与 `RegisterGeneratorMethods` / `RegisterBoundCall`
**同一条理由**：那一趟本来就在登记「哪些内部号存在」）。

**为什么引擎要提供一个登记入口、而不是自己定号**：号是**语言层**的——
引擎只认「回调的时候那个载荷号是不是这一格」（`ThenableHookId`）。

**返回假表示「号不在这一次装载的 id 表里」**（与 `RegisterCapability` 的纪律一字不差）。

```ts
this.ThenableHookId = id;
return this.RegisterCapability(id, Value.FromRef(ValueTag.HostRef, this.Table.CreateHostRef(id, 0)));
```

## method RegisterPropertyKeyHook:(id:int)=>bool

**把「这个值是什么属性键」那个能力号登记进能力表**（第 750 轮）——与
`RegisterThenableHook` **同一条形状、同一个理由**（号是语言层的，
引擎只记「回调的时候那个载荷号是不是这一格」）。

```ts
this.PropertyKeyHookId = id;
return this.RegisterCapability(id, Value.FromRef(ValueTag.HostRef, this.Table.CreateHostRef(id, 0)));
```

## method PropertyKeyOf:(rawKey:Value)=>Value | null

**把 `get_index` / `set_index` 那一格的键归一成属性键**（第 750 轮）。

**两档与第 305 轮那两句一字不差**：**符号原样**（身份，字符串化会与同名文本键撞上）、
其余走 `RtToString`。**新加的是对象那一档**：原来对象会落进 `RtToString` ⇒
`TextUnitsOf` 对对象**响亮地抛**（`unimplemented: ToString of this kind of value`）
⇒ **整份文件跑不起来**，而 JS 里 `t[new Set()] = "x"` 给 `"[object Set]"`。

**没登记钩子（`0`）就照旧走 `RtToString`**：那一档仍然抛，与第 750 轮之前
**一字不差**——「不做」不等于「换个行为」，与 `ThenableHookId` 那条纪律同源。

**`null` 的意思是「展开已经发生」**（脚本在那个 `toString` 里抛了，`DoThrow` 已经
把控制流交给处理点）——与 `CallHostValue` 那条纪律一字不差：调用方**必须立刻收手**，
连结果都不许往槽里写。

```ts
if (rawKey.Tag === ValueTag.Symbol) return rawKey;
if (rawKey.IsObject() && this.PropertyKeyHookId > 0) {
  const hookValue = Value.FromRef(ValueTag.HostRef, this.Table.CreateHostRef(this.PropertyKeyHookId, 0));
  const hookArgs: Value[] = [rawKey];
  const converted = this.CallHostValue(hookValue, Value.Undefined(), hookArgs);
  if (converted === null) return null;
  return converted;
}
return RtToString(this.Room(), this.Table, rawKey);
```

## method RegisterGeneratorMethods:(nextId:int, returnId:int, throwId:int)=>bool

**把生成器那三格方法的能力号登记进能力表**（第 229 轮开的头、第 313 轮扩成三个）——
由语言层在 `InstallBuiltins` 里调（与它登记 `DefineAccessorId` 那一族**同一条理由**：
那一趟本来就在登记「哪些内部号存在」）。

**为什么引擎要提供一个登记入口、而不是自己定号**：号是**语言层**的（`globals.xl.md`）——
引擎只认「调用的时候那个载荷号是不是这三格之一」（`GeneratorStepKind`）。
**依赖方向仍然是 `vm → props` / `builtins → runtime`**：引擎不认识「生成器」
在语言里叫什么，它只认识**自己提供的那个服务**。

**三个号一次登记**（第 313 轮改的）：它们**是同一件事的三个方向**
（往下走 / 结束掉 / 往里抛），而**引擎侧那两处判据只有一份**
（`GeneratorStepKind`）——分成三个入口就是三处会漂。

**返回假表示「号不在这一次装载的 id 表里」**（与 `RegisterCapability` 的纪律一字不差）：
登记不进去不是「静默忽略」，宿主必须知道。

```ts
const nextHandle = this.Table.CreateHostRef(nextId, 0);
const returnHandle = this.Table.CreateHostRef(returnId, 0);
const throwHandle = this.Table.CreateHostRef(throwId, 0);
// **记下这三格号**：`GeneratorStepKind` 靠它们认「这一次调用是我自己的」
// ——见 `GeneratorNextId` 那一段为什么 `0` 要显式排掉。
this.GeneratorNextId = nextId;
this.GeneratorReturnId = returnId;
this.GeneratorThrowId = throwId;
const registeredNext = this.RegisterCapability(nextId, Value.FromRef(ValueTag.HostRef, nextHandle));
const registeredReturn = this.RegisterCapability(returnId, Value.FromRef(ValueTag.HostRef, returnHandle));
const registeredThrow = this.RegisterCapability(throwId, Value.FromRef(ValueTag.HostRef, throwHandle));
return registeredNext && registeredReturn && registeredThrow;
```

## method IsBoundCall:(callee:Value)=>bool

**这个值是不是 `bind` 造出来的那个「带载荷的对象」**（第 343 轮）——用来决定
**这一趟调用的 `this` 从哪来**（见 `DoCallValue` / `CallNative` 里那句 `hostThis`）。

**为什么需要它**（**实测撞到的**）：语言层原来给「**可调用对象**」一律补上
**对象自己**当 `this`（第 228 轮，为 `bind` 造的）——而 `super(m)` 是一条
**带接收者**的调用，接收者正是**已经在造的那个实例** ⇒ 被顶掉之后
`class A extends Error { constructor(m) { super(m) } }` 的实例 `message` 是**空串**
（而 `new Error("x")` 那一条是对的——**一半对一半错**）。
**两条路要的东西相反**，所以判据必须**窄到「就是 `bind` 那一格」**：
- `bind` 的对象 ⇒ **给对象自己**（那三样载荷藏在它自己的隐藏属性里）；
- 别的可调用对象（`String` / `Array` / `Date` / **构造函数对象**）⇒ **照调用方给的**
  （它们**一个字节都不看 `this`**——第 228 轮的注释里就是这么写的，
  只有 `bind` 那一格是例外）。

**`BoundCallId > 0` 那一半不能省**：与 `GeneratorStepKind` 那条**一字不差**——
语言层还没登记时它是 `0`，而 `HostRef.CapabilityId` 的默认值**也是 `0`**
⇒ 不排掉的话**任何一个**没登记过号的宿主引用都会撞上这条判据（**静默**走错分支）。

```ts
if (this.BoundCallId <= 0) return false;
if (callee.Tag !== ValueTag.Object) return false;
const item = this.Table.Get(callee.Ref);
if (item.Host === null) return false;
return item.Host.CapabilityId === this.BoundCallId;
```

## method RegisterBoundCall:(id:int)=>void

**告诉引擎「`bind` 是哪个号」**（第 343 轮）——与 `RegisterGeneratorMethods` 同一条形状：
语言层知道号、引擎不知道，所以由装库那一趟说一声（`install.xl.md` 的 `InstallBuiltins`）。

```ts
this.BoundCallId = id;
```

## method GeneratorStepKind:(callee:Value)=>int

**这一次调用是生成器的哪一格方法**（第 229 轮开的头、第 313 轮扩成三档）：
`0` = 不是、`1` = `next`、`2` = `return`、`3` = `throw`。

**为什么收成一个方法**：两条路要用同一条判据（`DoCallValue` 的调用路、
`CallNative` 的重入路——`it.next()` 走第一条，而 `Array.from` 那类
**急切**入口走的是引擎自己那条 `drain`，不经过这里）。
写两遍就是两处会漂，而漂了的表现是「脚本里直接 `next()` 可以、当回调传出去不行」。
**第 313 轮把「哪一格」也收进同一个方法**：`return` / `throw` 与 `next` 是**同一族的三个方向**，
分成三个 `Is…` 就是**六个调用点**。

**`GeneratorNextId > 0` 那一半不能省**：语言层还没登记时它是 `0`，
而 `HostRef.CapabilityId` 的默认值**也是 `0`**——不排掉的话，
**任何一个**没登记过号的宿主引用都会撞上这条判据（**静默**走错分支）。

```ts
if (this.GeneratorNextId <= 0) return 0;
if (callee.Tag !== ValueTag.Object) return 0;
const item = this.Table.Get(callee.Ref);
if (item.Host === null) return 0;
const id = item.Host.CapabilityId;
if (id === this.GeneratorNextId) return 1;
if (this.GeneratorReturnId > 0 && id === this.GeneratorReturnId) return 2;
if (this.GeneratorThrowId > 0 && id === this.GeneratorThrowId) return 3;
return 0;
```

## method RootKeeper:()=>RootKeeper

**把这台机器包成「挂根 / 摘根」那个开关**（第 199 轮）——理由与 `IteratorDrainer()` 一字不差。

**谁用**：语言层那条 `Symbol.iterator` **协议循环**（`install.xl.md` 的 `GetIterator`）——
它造一个数组、然后一轮一轮调 `next()`，中间那段时间正好是上面那个窗口。
**这一条是实测出来的**（第 199 轮）：6 万项的 `[...o]` 在 `invalid handle` 上炸过——
**不是新功能带来的**，是第 184 轮那条路本来就有的。

```ts
return (value: Value, on: boolean): void => {
  // **非引用型落成 `0`**：`SnapshotRoots` 按 `> 0` 过滤，所以「挂一个数」是空转——
  // 而语言层因此**不必**在每一处先判 `IsRef`（那是二十几处会走偏的判据）。
  const handle = value.IsRef() ? value.Ref : 0;
  if (on) {
    this.Temps.push(handle);
    return;
  }
  // **按值找、从内往外摘**：语言层那几处循环里有 `break` 也有 `throw`，
  // 栈顶弹出要求严格配对——那是一条一写错就收掉**别人的**根的规矩。
  for (let i = this.Temps.length - 1; i >= 0; i--) {
    if (this.Temps[i] === handle) {
      this.Temps.splice(i, 1);
      return;
    }
  }
};
```

## method ThrowValue:(value:Value)=>void

**抛一个已经造好的脚本值**（第 285 轮）——`DoThrow` 就是它。

**为什么还要这一层**：`DoThrow` 的调用点原来只有两条，两条手上都是
**宿主异常的文字**（`throw` 指令那条是脚本值，可它也是从槽里取的）。
`await` 一个**被拒绝**的承诺那一支手上是一个**脚本值**（拒绝理由，
字符串 / 数字 / `Error` 对象都可能）——它**一个字的翻译都不需要**，
直接抛才对（JS 的 `await` 抛的正是那个理由本身）。
走 `Guard` + 错误工厂那条路会把「一个字符串理由」变成 `Error("…")`——
`catch (e) { console.log(e) }` 于是印出别的东西（**静默错值**）。

**所以这不是转发，是多给一条入口**：`DoThrow` 是「把手上这个值抛出去」，
这一条是「让调用方说得清它手上那个值的来处」——两处都是**一个方法体**，
收在这里是为了让「抛一个值」只有一份实现。

```ts
this.DoThrow(value);
```

## method DoAwait:(frame:HeapFrame, instr:Instruction)=>void

`await`：把当前帧挂到承诺上，等它结清。

- **已兑现的承诺也要推迟一个微任务**（JS 语义：`await` 至少让出一个 tick）——
  所以两条分支都做「悬起当前帧 + 把恢复排进队列」，只是**已兑现的立刻就能排**；
- **挂起就是弹出帧栈**（与 `suspend` 一样），恢复由 `DrainMicrotasks` 负责；
- **兑现值写进帧的 `ResumeValue`**：由紧跟其后的 `resume` 搬进槽里——与生成器同一套。

**`await` 一个不是承诺的值**（第 285 轮）：JS 把它当成**已兑现为它**的值
（`await 2` 是 `2`），而且**照样让出一个 tick**。所以既不是抛、
也不能当场把值塞进槽里（那样 `console.log` 的行序会与 Node 差一行）。
做法是 `ResolveIntoPromise` 包一个已兑现的承诺——
**它与「已兑现的承诺」那一支走的是同一段**，一个字的特例都没有。

**`await` 一个被拒绝的承诺要抛**（第 285 轮）：抛的是**拒绝理由本身**
（`throw` 那一支，见 `ThrowValue`）。**位置很要紧**：
那一抛必须在**这一帧还在栈上**时落地——`await` 写在 `try` 里时，处理点是**这一帧**在册的；
先弹帧再抛，展开会跳过它（症状是 `try { await Promise.reject("x") } catch` 接不住）。

**拒绝那一档也要让出一个 tick**（第 610 轮）：它**原来是在 `DoAwait` 里当场抛**
（不摘帧、不进微任务队列）⇒ `await` 一个**已经拒绝**的承诺**一个 tick 都不让**
⇒ 后面那些排好的微任务**全被插到前面**。实测（最小判据）：

    async function boom() { throw new Error("boom"); }
    async function guarded() { try { await boom(); } catch { console.log("caught"); } }
    boom().catch(e => console.log("1", e.message));
    guarded();

Node 给 `1 boom` 在前（`boom()` 那一抛是**同步**结清的 ⇒ 它的 `.catch` 先入队），
本仓给 `caught` 在前——`guarded` 整段体**同步跑完**。而 `await` 一个**兑现**的承诺
那一档本来就是对的（下面那条 `Microtasks.push`）——同一个形状两种时序。

**做法与 `RejectPromise` 那条一字不差**（它管的是「**后来**才被拒绝」那一半）：
摘帧 → 记 `ResumeValue` → 拒绝时把 `ResumeRaises` 也置真 → 排进微任务队列。
`Op.Resume` 于是走 `DoThrow`、**此刻这一帧已经在栈上** ⇒ `try` 里接得住
（与原地抛**同一个落点**，只是晚了一个 tick）。两条路写同一件事，就不会再有「同一形状两种时序」。

**承诺是「采纳」来的也要等**（`await` 一个「兑现值是承诺」的承诺）：
这种「承诺链」挂在**内层**那个承诺的反应表上——见 `ResolvePromise` 的采纳那一支。

**它是 async 帧**：离开栈之前把「我在等谁」写进帧那一格（`AsyncPromise`）——
`DoReturn` 与 `DoThrow` 收尾时按它认人。**写在这一处而不是 `DoCallValue`**：
`DoCallValue` 写的是「**我这个 async 函数自己的承诺**」（交给调用者的那一个），
而这里写的是「**我现在等的是谁**」——**两个不同的承诺**，
只是同一格在两个阶段各住一次（在栈上时是前者、悬着时是后者）。

**而这一格「悬着还是跑着」正是恢复路要的那条判据**（见下面 `awaited.Ref` 那一行）：
`awaited.Ref` 与 `frame.AsyncPromise` 一定是**两个不同的句柄**——
「我自己那个承诺」与「我等的那个承诺」不是一回事
（除非 `await` 自己的承诺，那是**死锁**，JS 里也永远不结清——
而这一格写成这样，它至少**不会把帧当成已经在跑的**）。

```ts
const target = frame.Slots[instr.A];
// **不是承诺就包一个**：`ResolveIntoPromise` 是第 229 轮就留好的那一步
//（它当时只差「调用者那一半」，而那一半这一轮做完了）。
const awaited = this.IsPromiseValue(target) ? target : this.ResolveIntoPromise(target);
const item = this.Table.Get(awaited.Ref);
if (item.Promise === null) throw new Error("awaited value is not a promise");
const promise = item.Promise;
const handle = this.Frames.TopHandle();
this.Frames.Pop();
// **帧离开栈之前先记住「它在等谁」**：恢复时 `DoReturn` / `DoThrow` 要用它，
// 而它同时就是「这一帧现在不在栈上」那条判据（见 `HeapFrame.Awaiting`）。
frame.Awaiting = awaited;
// **还要记住「它是被 `await` 摘下来的」**（第 319 轮）：
// 生成器与异步生成器**都会**因为 `await` 离开栈，而 `suspend`（`yield`）也是同一件事
// ——两种挂起在帧上原来是**一模一样**的 ⇒ 推进异步生成器的那一侧只看得到
// 「挂起了」，分不出「产出了一个值」与「还在等一个承诺」
//（症状：`yield await x` 之后那一次 `next()` 被当成**结束**，
//  实测 `await it.next()` 给 `{"done":true}`，Node 给 `{"value":2,"done":false}`）。
// **它由紧跟其后的 `resume` 清掉**（两条恢复路都经过那一条指令）。
frame.SuspendedInAwait = true;
// **已经结清的（兑现或拒绝）：当场就能排**——**除非这一帧已经挂在同一个承诺上了**。
//
// **那一档是可能的**（第 285 轮想到的）：`await p` 写在**嵌在 `p.then(…)`
// 里的那个函数**里时，「等 `p`」与「被 `p` 恢复」是同一件事——
// 再排一次，这一段就会被**重复恢复**（`resume` 拿到的是**上一次**的 `ResumeValue` ⇒
// 一个看起来成立、其实早了的值，**静默错值**）。
// 与 `AdoptInto` 那一处**同一条判据**（`IsAwaitedBy`）——
// 「别把一个已经等着我的帧再排一次」只有一份实现。
if (promise.State !== PromiseState.Pending) {
  frame.ResumeValue = promise.Value;
  if (promise.State === PromiseState.Rejected) {
    frame.ResumeRaises = true;
  }
  if (!this.IsAwaitedBy(promise, handle)) this.Microtasks.push(handle);
  return;
}
// **还是 `Pending`**：这一刻也可能它「其实是一个承诺链」——
// 那种承诺一直是 `Pending`、反应表是**内层**那个承诺在管。
if (!this.IsAwaitedBy(promise, handle)) promise.Reactions.push(handle);
```

## method SettleCallbackKind:(callee:Value)=>int

**这一次调用是不是「执行器递出来的 `resolve` / `reject`」**（第 318 轮）：
`0` = 不是、`1` = `resolve`、`2` = `reject`。

**为什么引擎要认识这两格**：它们由**语言层**造（`MakeSettleCallback`）、
而脚本是**当普通函数**调的（`(resolve) => resolve(1)`，**没有接收者**）
⇒ 走宿主那条路时语言层拿不到「它管的是哪个承诺」 ⇒ 那个承诺**永远不结清**
（症状是宿主那句话 `the script is waiting for a promise the host has not settled`）。
**引擎认得出来**：那两格的载荷号是语言层登记进来的，而承诺的句柄就在载荷的 `Opaque` 里
——**与生成器那三格同一个手法**（第 229 / 313 轮：引擎不认识「`then` 是什么」，
只认识**自己提供的那个服务**）。

**判据的形状必须照 `IsHostCallable` 抄**（**第 317 轮就是在这里翻的车**）：
原来是 `if (callee.Tag !== ValueTag.Object) return 0;`——而这两格是 **`HostRef`**、
**不是 `Object`** ⇒ 这一句**当场把它们排掉了** ⇒ 整条路**从不执行**，
而症状是「判据明明写对了却什么都没发生」（第 317 轮为此把整套机关**撤回**了一次，
这一轮靠「把判据改成无条件抛、看抛出来的是谁」才定位到）。
**两种壳都要认**（`HostRef` 与带载荷的对象，与 `IsHostCallable` 一字不差）。

**`0` 必须显式排掉**（与 `GeneratorNextId` 那一段同一条）：`HostRef.CapabilityId`
的默认值就是 `0`，不排掉的话任何没登记过的宿主引用都会撞上这条判据。

```ts
if (this.SettleResolveId <= 0) return 0;
if (callee.Tag !== ValueTag.HostRef && callee.Tag !== ValueTag.Object) return 0;
const item = this.Table.Get(callee.Ref);
if (item.Host === null) return 0;
const id = item.Host.CapabilityId;
if (id === this.SettleResolveId) return 1;
if (this.SettleRejectId > 0 && id === this.SettleRejectId) return 2;
return 0;
```

## method RegisterSettleCallbacks:(resolveId:int, rejectId:int)=>bool

**把执行器那两格的能力号登记进能力表**（第 318 轮）——与 `RegisterGeneratorMethods`
**同一套分界**（号是语言层的，引擎只认「调用时那个载荷号是不是这两格」）。

```ts
this.SettleResolveId = resolveId;
this.SettleRejectId = rejectId;
const resolveHandle = this.Table.CreateHostRef(resolveId, 0);
const rejectHandle = this.Table.CreateHostRef(rejectId, 0);
const registeredResolve = this.RegisterCapability(resolveId, Value.FromRef(ValueTag.HostRef, resolveHandle));
const registeredReject = this.RegisterCapability(rejectId, Value.FromRef(ValueTag.HostRef, rejectHandle));
return registeredResolve && registeredReject;
```

## method IsAwaitedBy:(promise:HeapPromise, handle:int)=>bool

**这一帧是不是已经挂在这个承诺的反应表上了**（第 285 轮）。

**为什么必须有这一问**：`AdoptInto` 会把**待恢复的 async 帧**推进反应表，
而 `await` 那一支也会推——两条路推的是**同一个承诺、同一帧**时，
这一段会被恢复两次（第二次拿到的是**上一次**留下的 `ResumeValue` ⇒ 静默错值）。

```ts
for (let i = 0; i < promise.Reactions.length; i++) {
  if (promise.Reactions[i] === handle) return true;
}
return false;
```

## method IsPromiseValue:(value:Value)=>bool

**这个值是不是一个承诺**（第 285 轮）——`await` 那一支要判一次，
而建库层那一份判据（`promise.xl.md` 的 `IsPromise`）**在另一棵树里**
（`runtime/` 不认识 `typescript-exec/`）。

```ts
if (!value.IsObject()) return false;
return this.Table.Get(value.Ref).Promise !== null;
```

## method SettleAsync:(promiseHandle:int, value:Value)=>void

**兑现一个 async 帧的承诺**（第 285 轮）——`return v` 的语义就是它。

**`v` 本身是承诺时要「采纳」**（JS 的 `Promise` 解决过程）：
`async function f() { return Promise.resolve(1) }` 的 `f()` 兑现为 **`1`**，
不是那个承诺——所以不能把承诺当值灌进去。

```ts
const promise = Value.FromObject(promiseHandle);
if (this.IsPromiseValue(value)) {
  this.AdoptInto(promise, value);
  return;
}
this.ResolvePromise(promise, value);
```

## method AdoptInto:(promise:Value, inner:Value)=>void

**让 `promise` 跟随 `inner`**（第 285 轮）——JS 的 `Promise` 解决过程里
「兑现值是一个承诺」那一支。

**实现是一格反应**（与 `await` 挂帧**走的是同一张表**，一个机关都没多）：
`inner` 结清时把 `promise` 的句柄推进微任务队列——
那一刻 `DrainMicrotasks` 会 `PushBack` 它（因为 `Promise > 0`），
而它从前一条指令（`await` 后面那条 `resume`）接着跑，
**承接值就在 `ResumeValue` 里**（`ResolvePromise` 那一句写的）。

**这一格「帧」从来不在栈上**：它是**待恢复的 async 帧**——
所以 `Promise > 0` 那条判据（`DrainMicrotasks`）正好认得它。

```ts
if (!inner.IsObject()) return;
const item = this.Table.Get(inner.Ref);
if (item.Promise === null) {
  this.ResolvePromise(promise, inner);
  return;
}
const innerPromise = item.Promise;
if (innerPromise.State === PromiseState.Fulfilled) {
  this.ResolvePromise(promise, innerPromise.Value);
  return;
}
if (innerPromise.State === PromiseState.Rejected) {
  this.RejectPromise(promise, innerPromise.Value);
  return;
}
if (!promise.IsObject()) return;
if (!this.IsAwaitedBy(innerPromise, promise.Ref)) innerPromise.Reactions.push(promise.Ref);
```

## method MakeAsyncPromise:(state:int, settled:Value)=>Value

**造一个承诺**（第 285 轮）——async 帧（以及执行器那一格）的承诺都由这里造。

**为什么引擎要自己造、不能借建库层的 `MakePromise`**（**第一版就是直接 `CreatePromise`**）：
两个调用点**在引擎内部**——`DoCallValue` 的 async 那一支 与 `DoThrow` 的拒绝那一支，
那一刻手上只有自己的字段（`runtime/` 不认识 `typescript-exec/`，依赖方向不能倒）。
可**光造一个裸承诺是不够的**：脚本对 `f()` 的第一件事**几乎总是 `.then(…)`**——
而 `.then` 是**建库层挂上去的属性**，裸承诺上没有它
（症状：`f().then(v => …)` 报「调了一个不是函数的东西」，
听起来像脚本写错了，其实是**`f()` 返回的那个承诺少了三个方法**）。

**第 285 轮的做法是「把 `then` / `catch` / `finally` 三个方法挂在实例上」**——
引擎自己造三个宿主引用，号是**语言层的约定**（`promise.xl.md` 的
`PromiseThen` = 235、`PromiseCatch` = 236、`PromiseFinally` = 237；
这与 `ConstructorProtos` / `SetErrorFactory` / `PrototypeKey` 是**同一套分界**：
引擎不认识「then」这个词，它只是把一个号放进一个属性格）。

**第 697 轮改成「把原型那一格接上」**——两条理由都是量出来的：

1. **挂实例上修不了「它是不是一个承诺」**：`instanceof Promise` 看的是**原型链**
   （`protos.Promise`）、`Object.prototype.toString` 看的是那一格，
   而这里造出来的东西原型一直是 `protos.Object` ⇒
   `(async function () { return 1; })() instanceof Promise` 给**假**、
   `Object.prototype.toString.call(…)` 给 `[object Object]`、
   `.constructor` 干脆**没有**（`p.constructor.name` 抛 `TypeError`，
   判据 `runtime/async/probe697-p03` / `p04` / `p11`）。
2. **那三个方法第 690 轮已经在 `Promise.prototype` 上了**
   （`Object.getOwnPropertyNames(Promise.prototype)` 与 Node 逐字相同：
   `constructor` / `then` / `catch` / `finally`）——再在实例上挂一份就是**第二份账**，
   而它的症状是 `Object.getOwnPropertyNames(promise)` 里凭空多出三格
   （判据 `runtime/async/probe697-z15`）。

**原型那一格照旧是「可选服务」的口径**：`protos.Promise > 0` 才接
（`protos` 没接那一格时退回原型为 `Object` 的老行为，与 `AttachGeneratorProto` 同款）。

```ts
const protos = this.Protos;
if (protos === null) throw new Error("no prototype table");
return this.Guard(() => {
  const room = this.Room();
  // **只问承诺自己那一格**（与建库层 `MakePromise` 同一个数）：
  // 三个方法的钱第 697 轮起不用再问——它们不在实例上。
  if (!room(ObjectCharge + ValueCharge * 3)) {
    throw new Error("out of room");
  }
  const promise = Value.FromObject(this.Table.CreatePromise(state, settled));
  if (protos.Promise > 0) {
    this.Table.Get(promise.Ref).Proto = protos.Promise;
  }
  return promise;
});
```

## method NeverCall:(callee:Value, self:Value, args:Array<Value>)=>Value

**装上属性时用的调用通道桩**（第 285 轮）——`SetProperty` 要一个通道
（万一碰上访问器就要调它），而这里写的是**刚造出来的承诺**（它自己的格全是数据属性）。

**它一次都不该被调到**，真被调到就**报出来**（比静默好）——
与 `builtins/array.xl.md` 那个同名的桩**一字不差**（那是另一棵树里的，
两棵树的依赖方向不允许共用一个）。

```ts
throw new Error("unreachable: installing a promise method never calls a function");
```

## method ResolveIntoPromise:(value:Value)=>Value

**把一个任意值包成「已兑现为它」的承诺**（第 229 轮）——`Promise.resolve(v)` 的语义只有这一份。

**它今天是给「`await` 一个不是承诺的值」用的**（第 285 轮接上了）：
`await 2` 在 JS 里等于「等一个已兑现为 `2` 的承诺」——**照样让出一个 tick**
（不包的话，`await 2` 后面的那一段会与同步代码挤在同一个 tick 里，
而 Node 的行序会当场露出来）。

**第 229 轮它只差另一半**（当时调用者拿不到承诺，于是一条「响亮地抛」
会变成「静默 `undefined`」）——那一半这一轮补齐了（`DoCallValue` 的 async 那一支）。

**它走 `MakeAsyncPromise`**（第 285 轮）：`await somePromise` 里那个承诺
**最后可能落到脚本手上**（`const p = await (async () => …)(); p.then(…)`），
所以它也得带着那三个方法——**一个「少三个方法的承诺」是最难查的一种**。

```ts
return this.MakeAsyncPromise(PromiseState.Fulfilled, value);
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
// **兑现值本身是承诺时要「采纳」**（第 317 轮）——JS 的解决过程那一支：
// `p.then(() => Promise.resolve(1))` 的结果承诺**跟随内层**（不是把承诺对象当值灌进去）、
// `new Promise(r => r(other))` 同理。
//
// **为什么落在这里**：走 `ResolvePromise` 的路**不止一条**——`.then` 回调的返回值、
// 执行器里的 `resolve(x)`、`Promise.all` 收的值、`SettleAsync`——
// 而**「兑现值是个承诺」的语义在每一条上都一样**。收在**最下面这一处**
// 就是「同一个语义一处实现」（原来只有引擎那条 async 支路做了它，
// 于是 `async` 那一半对、`.then(() => Promise.resolve(…))` 那一半**把承诺对象当值**，
// 实测：后面那个 `.then` 收到的是**一个带 `then`/`catch`/`finally` 的对象**，Node 收到 `3`）。
//
// **自己等自己**那一格（JS 抛 `TypeError`）**没做**：记在台账里
//（做的话要一条环检测 + `TypeError` 那一族）。
if (this.IsPromiseValue(settled)) {
  this.AdoptInto(promise, settled);
  return;
}
// **兑现值是个「可采纳对象」（thenable）时也要采纳**（第 359 轮，**实测撞到的**）：
// JS 的解决过程那一条**不止认承诺**——`{ then(res) { res(42); } }` 也一样被采纳
// （判据 `c305-std-thenable-adoption`：Node 给 `v 42`、
//  本仓原来给 `v { then: [Function: then] }`——**把 thenable 当普通值灌进去了**）。
//
// **判据落在语言层**：要读一格叫 `then` 的属性、还可能要调它，
// 而引擎**不认识那个名字**（与 `BoundCallId` / `Symbol.hasInstance` 同一条分界）——
// 语言层登记一个**能力号**，引擎只负责「看到对象就问一句」。
// **钩子说「我认领了」才停**（返回真）：不是 thenable 就照旧按普通值兑现
//（**没登记钩子时这一档整段跳过**，行为一字不改）。
if (settled.IsObject() && this.ThenableHookId > 0) {
  const hookValue = Value.FromRef(ValueTag.HostRef, this.Table.CreateHostRef(this.ThenableHookId, 0));
  const hookArgs: Value[] = [promise, settled];
  const taken = this.CallHostValue(hookValue, Value.Undefined(), hookArgs);
  if (taken !== null && taken.Tag === ValueTag.Bool && taken.Int !== 0) {
    return;
  }
}
promise2.State = PromiseState.Fulfilled;
promise2.Value = settled;
for (let i = 0; i < promise2.Reactions.length; i++) {
  const handle = promise2.Reactions[i];
  if (this.Table.IsValid(handle)) {
    const waiting = this.Table.Get(handle);
    // **等在这一格上的是一个「被采纳的承诺」**（`AdoptInto` 的 pending 那一支）：
    // 它要的是**同一个结清**，不是「被当成帧推回栈上」——`AsFrame()` 对一个承诺对象
    // 只会把值写进一堆不相干的格，然后把承诺句柄推给 `DrainMicrotasks`，
    // 而那边按「帧」处理它（**静默错值**）。判据是它自己有没有承诺载荷。
    if (waiting.Promise !== null) {
      this.ResolvePromise(Value.FromObject(handle), settled);
      continue;
    }
    waiting.AsFrame().ResumeValue = settled;
    this.Microtasks.push(handle);
  }
}
promise2.Reactions = [];
// **原生任务那一格也要排**（第 185 轮）：`.then(fn)` 挂上来的回调与 `await` 的帧
// **同一条队列、同一个次序**——挂上谁先，就谁先跑（`Microtasks` 那一段的说明）。
for (let i = 0; i < promise2.NativeReactions.length; i++) {
  const index = promise2.NativeReactions[i];
  const task = this.NativeTasks[index];
  task.Reject = false;
  // **兑现值接在实参后面**（与「已经结清」那一支同一条口径）：回调的形状是
  // `(…挂上时的实参, 结清值)`——`Promise.all` 那一步正靠它收值。
  task.Args.push(settled);
  this.Microtasks.push(0 - index - 1);
}
promise2.NativeReactions = [];
this.ForgetNativeHost(promise.Ref);
```

## method RejectPromise:(promise:Value, reason:Value)=>void

**拒绝一个承诺**（第 185 轮）：记下那一格，把等着它的**帧**与**原生任务**全部排进微任务队列。

**幂等**：已经结清的承诺再拒绝一次是静默的（与 `ResolvePromise` 同一条口径）。

**第 330 轮之前这里写着「帧那一档不动」**，理由是「`await` 一个被拒绝的承诺要抛，
而那一层在 `DoAwait` 里」——**那一句只说对了一半**：`DoAwait` 只处理
「`await` 的那一刻**已经**被拒绝」，而**还挂着的**承诺是**后来**才被拒绝的
（本仓绝大多数 async 都是这一档：体里跑过 `await` 才抛的地方）。
⇒ 那一帧**再也不会被恢复**：`await` 后面的整段代码**一句都不跑**，
`try { await f() } catch { … }` 里那个 `catch` **也不跑**，
而**退出码还是 0**（**静默错值**，本仓最坏的那一档）。

**实测**（第 330 轮）：`async function f() { await null; throw new Error("x") }` 之后
`try { await f() } catch { console.log("caught") } console.log("done")` ——
Node 给 `caught` + `done`，本仓**一行都不出**；
而「不 await 就直接抛」 / `await Promise.reject(…)`（拒绝那一瞬已经结清）/
`await` 一个普通函数返回的 `Promise.reject(…)` **三条都是对的**
——**同一个形状三种时序，只错最日常的那一种**。

**做法与 `ResolvePromise` 那条对称**：等的那个是**帧**就写 `ResumeValue` 并
把 `ResumeRaises` 置真（`Op.Resume` 于是走 `DoThrow`，`try` 里接得住、
接不住就落到 `DoThrow` 的 async 那一支去拒绝**这一帧自己的**承诺）；
等的那个是**被采纳的承诺**就跟着拒绝。两条都不新加机关。

```ts
if (!promise.IsObject()) throw new Error("not a promise object");
const item = this.Table.Get(promise.Ref);
if (item.Promise === null) throw new Error("not a promise");
const promise2 = item.Promise;
if (promise2.State !== PromiseState.Pending) return;
promise2.State = PromiseState.Rejected;
promise2.Value = reason;
for (let i = 0; i < promise2.Reactions.length; i++) {
  const handle = promise2.Reactions[i];
  if (!this.Table.IsValid(handle)) continue;
  const waiting = this.Table.Get(handle);
  // **被采纳的那个承诺也要跟着被拒绝**（第 317 轮，与 `ResolvePromise` 那条对称）：
  // 内层失败时外层**跟随**它失败（JS 的解决过程）。
  if (waiting.Promise !== null) {
    this.RejectPromise(Value.FromObject(handle), reason);
    continue;
  }
  // **等着这一格的是一个挂起的帧**（`await` 那一支）：它要的**不是一个值**，
  // 而是**在挂起点抛一个值**（JS 的 `AwaitExpression` 语义）——
  // 所以除了 `ResumeValue`，还要把 `ResumeRaises` 一起置真。
  // **顺序也要紧**：两格都必须在**推进队列之前**写好——
  // `DrainMicrotasks` 可能在这一次调用返回之后**立刻**跑它。
  const resumed = waiting.AsFrame();
  resumed.ResumeValue = reason;
  resumed.ResumeRaises = true;
  this.Microtasks.push(handle);
}
promise2.Reactions = [];
for (let i = 0; i < promise2.NativeReactions.length; i++) {
  const index = promise2.NativeReactions[i];
  const task = this.NativeTasks[index];
  task.Reject = true;
  task.Args.push(reason);
  this.Microtasks.push(0 - index - 1);
}
promise2.NativeReactions = [];
this.ForgetNativeHost(promise.Ref);
```

## method DrainMicrotasks:()=>bool

把微任务队列跑干净。**宿主每跑完一次脚本调用都该调它一次**（`Ts_Call` 的收尾）。

每个微任务**要么是一个挂起的帧**（`await` 那一路）、**要么是一个原生任务**
（`.then` 那一路，第 185 轮）——两种都在**同一条队列**里、按**先进先出**跑。

- 帧那一路：它是**同一个调用接着跑**（与生成器不同），所以用 `PushBack`：**不动它的 `ReturnSlot`**
  ——入口函数返回时那个值才会照常落到 `Result` 上；
- 原生任务那一路（第 185 轮）：**调那个闭包**（`CallNative`——它会建帧、跑到返回）、
  把结清值**接在实参后面**、返回值**灌进结果承诺**；
- 跑的过程中状态被改（脚本抛了、预算用尽）就**停下**，队列里剩下的留到下一次；
- 全跑完之后**把外层状态还原**：这一趟只是「顺手把微任务清了」，
  不该把「入口函数已经返回（`Halted`）」改写成 `Ready`。

**`Finished` 也要一起还原**（第 286 轮实测**逼出来**的）——它原来只还原了 `Status`。

**为什么它是必需的**：`Finished` 是**机器级**的一个结论（「入口函数返回了没有」），
而**微任务里跑的那些调用会顺手改它**——现场是 `DoIterNext`：
它一进来就把 `Finished` 清成假（那一条是**为生成器入口**写的：
宿主从外面推生成器时，上一次那台机器的结论不许带进来）。

**症状**（实测 `tmp-wf1.ts`）：模块顶层跑了 `for (const n of [1, 2, 3])`
⇒ 那一趟把 `Finished` 清成假 ⇒ 而**入口函数早就返回了**（它本来就该是真）
⇒ 宿主 `Classify` 于是看到「没跑完、还挂着」 ⇒
`tsrun` 打的是 **`第 0 份模块求值：the script is waiting for a promise the host has not settled`**
——**而 stdout 是逐字节正确的**（那一条 `serial` 早就印出来了）。
**一句话里没有一个字提到 `for..of` 或 `Finished`**，离现场极远；
**而它只在「入口那一趟跑过一次 `for..of`、之后还有微任务」时才出现**
（所以 `e2e-async-workflow` 红、`prm-async-await` 绿——同一个实现两份判决）。

**为什么还原比「让 `DoIterNext` 别写」更对**：`DoIterNext` 那一条**是对的**
（宿主推生成器时确实不该继承上一次的结论）——错的是**这一趟不该把它带走**。
「谁改了它、谁就负责还原」在这里就是「排空微任务这一个动作不许改机器的结论」，
与 `Status` 那一句是**同一件事的两半**。

```ts
const outer = this.Status;
// **`Finished` 是同一个「外层结论」的另一半**（理由见上）。
// **`DoIterNext` 会在微任务里把它清掉**——不还回去，宿主就会把
// 「入口早就返回了」读成「还挂着」（`Classify` 那句 `Parked`）。
const outerFinished = this.Finished;
while (this.Microtasks.length > 0) {
  const before: VmStatus = this.Status;
  if (before !== VmStatus.Ready && before !== VmStatus.Halted) return false;
  const entry = this.Microtasks[0];
  this.Microtasks = this.ShiftInt(this.Microtasks);
  if (entry < 0) {
    this.RunNativeTask(0 - entry - 1);
    const settled: VmStatus = this.Status;
    if (settled !== VmStatus.Ready && settled !== VmStatus.Halted) return false;
    continue;
  }
  const handle = entry;
  if (!this.Table.IsValid(handle)) continue;
  const depth = this.Frames.Depth();
  this.NativeResult = new Value();
  this.Frames.PushBack(handle);
  this.RunToDepth(depth);
  const after: VmStatus = this.Status;
  if (after !== VmStatus.Ready && after !== VmStatus.Halted) return false;
}
this.Status = outer;
this.Finished = outerFinished;
return true;
```

## method ForgetNativeHost:(handle:int)=>void

**把一格承诺从「挂着原生反应」的名单里去掉**（第 185 轮，结清时调）。

```ts
const kept: number[] = [];
for (let i = 0; i < this.NativeHosts.length; i++) {
  if (this.NativeHosts[i] !== handle) kept.push(this.NativeHosts[i]);
}
this.NativeHosts = kept;
```

## method FindFreeTask:()=>int

**找一个空槽，没有就新开一格**（第 185 轮）——空槽的判据是 `Callback` 不是引用。

```ts
for (let i = 0; i < this.NativeTasks.length; i++) {
  if (!this.NativeTasks[i].Callback.IsRef()) return i;
}
this.NativeTasks.push(new NativeTask());
return this.NativeTasks.length - 1;
```

## method ScheduleTask:(promise:Value, callback:Value, args:Array<Value>, result:Value, wants:int, carry:bool, onRejected:Value)=>void

**挂一个原生任务**（第 185 轮）——语言层的 `.then(fn)` 就走这一句。

**两种情形**（判据是「源承诺还在等吗」）：

- **还在等**：挂进它的 `NativeReactions`——它结清时由 `ResolvePromise` /
  `RejectPromise` 把这一格**排进微任务队列**（与 `await` 的帧同一条路）；
- **已经结清 / 根本不是承诺**：**当场排进队列**——语义上仍然**推迟**
  （`Promise.resolve(1).then(f => …)` 的回调不在这一句里跑，
  而是在这一趟脚本之后的微任务里跑，与 Node 的行序一致）。

```ts
if (!promise.IsObject()) {
  const index = this.AllocateTask(callback, args, result, false, wants, carry, onRejected);
  this.Microtasks.push(0 - index - 1);
  return;
}
const item = this.Table.Get(promise.Ref);
if (item.Promise === null || item.Promise.State !== PromiseState.Pending) {
  // **已经结清**：把它的值接在实参后面（回调看到的形状与挂反应那一路一致），
  // 并且**按它自己的状态**把「拒绝那一档」标出来——不然 `.catch` 挂在一个
  // 已经拒绝的承诺上会**不跑**（而 JS 里它正是为这一档准备的）。
  const rejected = item.Promise !== null && item.Promise.State === PromiseState.Rejected;
  if (item.Promise !== null) args.push(item.Promise.Value);
  const index = this.AllocateTask(callback, args, result, rejected, wants, carry, onRejected);
  this.Microtasks.push(0 - index - 1);
  return;
}
const index = this.AllocateTask(callback, args, result, false, wants, carry, onRejected);
item.Promise.NativeReactions.push(index);
// **挂上原生反应的承诺要记账**（第 185 轮）：任务里的闭包与实参**不在队列里**
// （队列里只有「已经可以跑」的那些），所以扫根时要按这张名单去找
// ——漏了这一格，症状是「回调闭包某天被回收掉」（只在堆压满时出现，最难复现）。
this.NativeHosts.push(promise.Ref);
```

## method EnqueueTask:(callback:Value, args:Array<Value>, result:Value, reject:bool, wants:int, carry:bool, onRejected:Value)=>void

**造一格任务并当场排队**（上面那一支「已经结清」走这里）。

```ts
const index = this.AllocateTask(callback, args, result, reject, wants, carry, onRejected);
this.Microtasks.push(0 - index - 1);
```

## method AllocateTask:(callback:Value, args:Array<Value>, result:Value, reject:bool, wants:int, carry:bool, onRejected:Value)=>int

**占一格任务、把三样东西写进去**（排队是调用方的事——挂反应那一路当时不排）。

```ts
const index = this.FindFreeTask();
const task = this.NativeTasks[index];
task.Callback = callback;
task.Args = args;
task.Result = result;
task.Reject = reject;
task.Wants = wants;
task.Carry = carry;
task.OnRejected = onRejected;
return index;
```

## method RunNativeTask:(index:int)=>void

**跑一格原生任务**（第 185 轮）：调闭包 → 返回值灌进结果承诺。

**结清值接在实参后面**（挂上时的实参在前、结清值在后）——
`Promise.all` 那一步正靠这一格收值。

**跑完就清空那一格**（空槽复用，见 `NativeTasks`）。

**结果承诺被拒绝的那一档**（`Reject`）：调完把结果**拒绝**掉。

```ts
if (index < 0 || index >= this.NativeTasks.length) return;
const task = this.NativeTasks[index];
const callback = task.Callback;
const result = task.Result;
const reject = task.Reject;
const wants = task.Wants;
const carry = task.Carry;
const onRejected = task.OnRejected;
const args = task.Args;
task.Callback = new Value();
task.Args = [];
task.Result = new Value();
task.Reject = false;
task.Wants = 2;
task.Carry = true;
task.OnRejected = new Value();
if (!callback.IsRef()) return;
// **这一格认不认这一档**（第 185 轮）：不认就**跳过回调**、
// 把源那一档**原样传下去**（JS 的 `.then(f)` 遇到拒绝就是这个形状）。
const carried = args.length > 0 ? args[args.length - 1] : Value.Undefined();
// **「原样传下去」**（第 187 轮）：不认这一档（\`0\` / \`1\` 的不匹配）、
// 或者这一步本来就是 \`.finally\` （\`4\`）——把**源那一档**灌进结果承诺。
const matched = wants >= 2 || (wants === 1) === reject;
const passThrough = wants === 4;
// **`.finally` 那一档要排在「认不认这一档」之前**（第 613 轮，**实测撞到的**）：
// JS 里 `Promise.prototype.finally(cb)` 是 **`then` 拼出来的**（规范那一步
// `thenCallbacks = [cb, cb]` + `then(...)`）——所以 `.finally` 的**结果承诺就是
// 那一跳 `then` 的结果**，而 `cb` 里抛的错**落在那一跳的同一个 tick 里**。
// 本仓原来把它当成「认这一档、跑回调、再传下去」三件事 ⇒ 拒绝**晚一跳**
//（判据 `c371-stdlib-promise-finally-passthrough` 量的就是这个行序：
// Node 给 `c3 replaced` 在 `v 1` 之前，本仓给它在之后）。
//
// **`.finally` 的 `matched` 恒真**（`4 >= 2`）⇒ 下面那个 `!matched` 那一支
// **接不接得到它都不影响**——**不能**用「先结清再跑回调」那种写法：
// 回调抛了的时候，先结清等于拿**源那一档**把结果承诺定死了
// ⇒ 后面那句「回调抛出来的错」**再也写不进去**（实测：打出 `c3 orig3`，
// 而 Node 给 `c3 replaced`）——**静默错值**，比行序错更坏。
// 所以这里换的只有**次序**：`matched` 那一格照旧先算。
if (!matched) {
  if (reject) {
    this.RejectPromise(result, carried);
  } else {
    this.ResolvePromise(result, carried);
  }
  return;
}
// **两条路**（第 187 轮）：\`.then(f, g)\` 的拒绝那一档调 \`g\`——
// 没给（或者给的不是函数）就**原样传下去**（JS 的口径）。
let chosen = callback;
if (wants === 3 && reject) {
  if (!this.IsHostCallable(onRejected) && onRejected.Tag !== ValueTag.Closure) {
    this.RejectPromise(result, carried);
    return;
  }
  chosen = onRejected;
}
const produced = this.CallNative(chosen, Value.Undefined(), args);
// **回调里抛出来的错要变成「结果承诺被拒绝」**（第 285 轮）——
// 这是 `promise-chaining-errors` / `promise-then-value-and-throw` 两条判据的根。
//
// **它原来是「整份程序挂掉」**：回调里那一抛一个处理点都找不到，
// `DoThrow` 于是把状态置成 `Threw`、把帧栈清空、把值留在 `Pending`——
// 而这一句之后**没有任何人看那三样**，于是 `tsrun` 打的是
// `脚本抛出：mid`（判据现场就是这个），而 Node 打的是 `caught mid`。
//
// **判据是 `Status === Threw` 这一条，不是 `CallFailed`**：
// 脚本自己在回调里 `try { … } catch { … }` 接住的那些**也**让 `Throws` 加一、
// 也让 `NativeFailed` 为真——可它们**不是失败**（状态是 `Ready`）。
// 只有「展开到了最外面、一个处理点都不剩」才是这一格要管的。
//
// **结清之后要把状态放回去**：`DoThrow` 把它置成了 `Threw`，
// 而这一趟微任务**还要接着跑**（`.catch` 的回调就排在队里）——
// `DrainMicrotasks` 每一轮都要求 `Ready` / `Halted`（它自己的守卫），
// 不还原的话，**接住这个拒绝的那条链一步都不会跑**
// （症状是「`.catch` 明明挂上了却一声不响」）。
//
// **放回哪一档由 `Finished` 说**：入口函数已经返回 ⇒ 这一趟是宿主在排空微任务
// ⇒ `Halted`；否则这一趟是**脚本自己同步跑出来的回调立刻抛了** ⇒ `Ready`
// （错的那一档会让外层那一段脚本**悄悄停下**——比抛坏得多）。
if (this.Status === VmStatus.Threw) {
  this.RejectPromise(result, this.Pending);
  this.Pending = new Value();
  this.Status = this.Finished ? VmStatus.Halted : VmStatus.Ready;
  return;
}
if (passThrough) {
  // **传值那一档要多一跳**（第 620 轮）：Node 的 `finally` 是
  // `Promise.resolve(回调的返回值).then(() => 源那一档)` 拼出来的——
  // 所以它**不在跑回调的同一跳里结清**，`finally` 与并列那几条链的行序差就在这一跳上
  //（判据 `c371-stdlib-promise-finally-passthrough`：Node 给 `c3 replaced` 在 `v 1` 之前）。
  // 回调**抛**的那一档在上面就结了、**不多跳**（与 Node 同形）。
  //
  // **这一跳走「执行器那两格」**（`MakeSettleCallback` 造的同一种宿主回调）：
  // 它们是现成的——调 `resolve` / `reject` 就是「把值灌进结果承诺」，
  // 与 `ResolvePromise` / `RejectPromise` 那两个分支**一字不差**（`CallNative` 里那一支）。
  // **`Result` 照旧写结果承诺**：不是给这一格结清用的（`carry` 是假），
  // 是给**回收器**用的——那两格的承诺住在载荷的 `Opaque` 里，而 `Trace` 不看它，
  // 不写这一格的话「回调跑之前来一次回收」就能把结果承诺收走（症状离现场极远）。
  // **没登记那两格就照旧当场传**：少一跳是「不做」，不是「说谎」。
  // **回调返回了一个承诺 ⇒ 要等它**（第 766 轮）：JS 的 `finally` 展开成
  // `Promise.resolve(回调()).then(() => 源那一档)`——所以回调**返回的那份承诺**
  // 被拒绝时，结果承诺跟着**被拒绝**（而不是把源那一档原样传下去）。
  // 原来这里只把回调的返回值**丢掉**（那一跳照旧传源那一档）⇒
  // `Promise.resolve(1).finally(() => Promise.reject(new Error("x"))).catch(f)`
  // 里那个 `f` **一声不响**（Node 打 `x`）——**静默错值**。
  //
  // **做法是换一个挂靠点**：把那「一跳」挂在**回调返回的那份承诺**上、
  // 认档位写 `0`（只认兑现）——于是两条路各归各的：
  //   · 它兑现 ⇒ 这一跳照常把**源那一档**灌进结果承诺；
  //   · 它被拒绝 ⇒ 引擎的 `!matched` 那一支把**它的原因**拒绝给结果承诺。
  // 回调**没返回承诺**时照旧挂一个 `undefined`（= 纯微任务那一跳，一个字都不变）。
  const settleId = reject ? this.SettleRejectId : this.SettleResolveId;
  if (settleId > 0) {
    const hop = Value.FromRef(ValueTag.HostRef, this.Table.CreateHostRef(settleId, result.Ref));
    const hopArgs: Value[] = [];
    hopArgs.push(carried);
    const producedIsPromise = produced.IsObject() && this.Table.Get(produced.Ref).Promise !== null;
    if (producedIsPromise) {
      this.ScheduleTask(produced, hop, hopArgs, result, 0, false, Value.Undefined());
      return;
    }
    this.ScheduleTask(Value.Undefined(), hop, hopArgs, result, 2, false, Value.Undefined());
    return;
  }
  if (reject) {
    this.RejectPromise(result, carried);
  } else {
    this.ResolvePromise(result, carried);
  }
  return;
}
if (carry) {
  // **回调跑过了，结果就是「兑现」**（第 188 轮修）：这一句原来按**源**那一档
  // （`reject`）决定结果的档——于是 `catch` / `then(f, g)` **接住了**拒绝之后，
  // 结果承诺**还是被拒绝**：后面接的 `.then(onFulfilled)` **一句都不跑**，
  // 而且**不报错**（实测：`Promise.reject("e").then(f, g).then(cb)` 印不出东西，
  // 而 Node 印 `g` 的返回值）。**「谁接住了这一档，结果就是兑现」**。
  //
  // **抛出去那一档是另一条**（第 285 轮）：回调里抛的错**在这一句之前**
  // 就按「结果承诺被拒绝」处置掉了（上面那一段）——所以能走到这儿的
  // `produced` 一定是**正常返回值**（拿它去兑现是对的）。
  this.ResolvePromise(result, produced);
}
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

**装上「宿主异常的文字 → 脚本要接住的值」这个工厂**（第 127 轮）——见 `Guard` 那一段。

**谁装**：**知道两边的那一层**（驱动 / 宿主）——`tsrun` 装的是
`(text) => NewError(room, table, protos, text)`（与 `RaiseFromHost` 用的是**同一个**构造，
所以「宿主函数失败」与「rt 层失败」在脚本看来是**同一种东西**）。

```ts
this.MakeError = make;
```

## method HostText:(error:any)=>string

**宿主异常 → 一句话**（引擎侧那一份最小的：只认 `message`）。

**为什么引擎里会出现 `error.message`**：这一层本来就贴着宿主跑
（`Guard` 里那句 `error.message === "out of room"` 早就是这个形状）——
引擎不认识的只是「**脚本**要接住什么」，而那是工厂决定的。

```ts
if (error !== null && error !== undefined && typeof error === "object" && "message" in error) {
  return String((error as any).message);
}
return String(error);
```

## method RegisterConstructorProto:(id:int, handle:int)=>void

**登记一个内建构造函数的原型**（第 137 轮）——语言层在建全局对象时调它
（`ConstructorProtos` 那一段写着为什么）。

**同一个号登记两次就以最后一次为准**（后写覆盖先写）：那样重跑一遍
`BuildGlobals` 不会把表越拉越长。

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

这个号登记过原型没有；没登记给 `0`（调用方据此退回「读 `prototype` 属性」那条路）。

```ts
for (let i = 0; i < this.ConstructorProtos.length; i = i + 2) {
  if (this.ConstructorProtos[i] === id) return this.ConstructorProtos[i + 1];
}
return 0;
```

## method Guard:(body:ValueThunk, kind:int = ErrorKindGeneric)=>Value

把 rt 层的异常分成三类：**资源上限** → 机器的状态、**装了错误工厂的其它异常** →
**脚本站内异常**（第 127 轮）、**其余** → 照旧冒出去（引擎 bug 要响）。

**`kind` 是「这是哪一类失败」**（第 139 轮）——默认 `ErrorKindGeneric`，
**类型失败**的调用点传 `ErrorKindType`（`null.y`、`undefined[0]`、调一个不是函数的值）。
**引擎不认识 `"TypeError"` 这几个字母**（见 `ErrorKindType` 那一段）。

**为什么「其余」也要分**：第 125 轮那条边界——`a + b` 两边都是变量、
运行期一边是对象时，引擎的 `RtAdd` 会抛；而那一抛**从 `Run()` 直接冒出来**，
脚本的 `try { … } catch { … }` **接不住**（宿主函数那条路第 121 轮就通了，
这一条是 **rt 层**的）。于是 `str + obj` 只能是「整份程序挂掉」——那不像 JS。

**为什么需要「错误工厂」而不是引擎自己造一个**：脚本要接住的是一个**值**
（`Error` 对象、带上 `message`），而「`Error` 长什么样」是语言层的事
（`text.xl.md` / `globals.xl.md` 的 `NewError`）——引擎不认识它。
所以驱动装一个工厂（`SetErrorFactory`），引擎只把**话**交过去。

**没装工厂就照旧冒**：纯脚本的宿主（判据里的裸机器）与「引擎 bug」那条路
保持原样——不假装自己能变出一个错误对象。

```ts
try {
  return body();
} catch (error) {
  if (error instanceof Error && error.message === "out of room") {
    this.Status = VmStatus.OutOfMemory;
    return Value.Undefined();
  }
  // **其余一律试着抬成脚本站内异常**（第 127 轮）：装了工厂才抬。
  if (this.MakeError !== null) {
    // **类别先从宿主异常的类里认一次**（第 228 轮，与 `RaiseFromHost` 那条同源）：
    // 调用方给的那一格是**默认值**（`ErrorKindGeneric`），而**宿主异常的类**是
    // 一条**更硬**的证据——`"x" + Symbol()` 抛的 `TypeError`（`rt.xl.md` 的
    // `TextUnitsOf`）在脚本里必须还是 `TypeError`（判据 `symbol-concat-throws`）。
    // **只认能证明的两族**（`TypeError` / `RangeError`）——别的（宿主自己那套自定义异常）
    // 一律落回调用方给的那一格，**不给近似值**。
    // **引擎仍然不认识 `"TypeError"` 这几个字母**：它认的是**宿主语言的类**
    //（那是它自己那一侧的事实），翻成名字的仍然是语言层（`tsrun` 的错误工厂）。
    let effectiveKind = kind;
    if (error instanceof TypeError) effectiveKind = ErrorKindType;
    else if (error instanceof RangeError) effectiveKind = ErrorKindRange;
    this.DoThrow(this.MakeError(effectiveKind, this.HostText(error)));
    return Value.Undefined();
  }
  throw error;
}
```

## method MakeClosure:(env:Value, code:int, name:Value, arity:int, source:Value)=>Value

造闭包（走 `Guard`：它要分配）。

**`name` 是函数名那一格**（第 238 轮）：**字符串值**（`undefined` 表示匿名）——
与 `HeapClosure.Name` 那一格的约定一致（`0` 表示匿名）。

**它补的是「函数显示名」**：`HeapClosure.Name` 一直**没人填**——
于是**每一个脚本函数**在 `console.log` 里都是 `[Function (anonymous)]`，
而 Node 给 `[Function: greet]` / `[Function: arrow]`（实测）。
那不是「一个格子没填」的小事：**Node 输出里到处是它**
（`ex-computed-member-call` 那条判据现场红的正是这一处）。

**名字从哪来**：`new_closure` 的第三格——**只有造它的那一方知道**
（降级层手里就有那个标识符的文本）。

**`arity` 是第 291 轮加进来的第四格**：它是 `fn.length` 的答案——
**算它的活不在这里**（降级层的 `FunctionArity`：那是**语法上的事**，
从 IR 里读不出「第一个默认值之前有几个形参」）。这一处只是把它**交给闭包那一格**。

**第 613 轮起它的最低位是「这是一个类」**（**不是**形参个数的一位）：
那一位由 `EmitClosure` 读 `item.IsClass` 之后拼进来（`arity * 2 + (是不是类 ? 1 : 0)`），
这一处把它**摘回去** 再交给闭包那一格。
**为什么借 `arity` 这一格、不另开一格**：`new_closure` 的五个操作数**排满了**
（环境 / code / 名字 / 形参 / 源码）——加第六格要同时改枚举、验证层与四个目标，
而这两样东西的**来处是同一个**（都在 `EmitClosure` 手里、都只在那一次求值时定死）。
**代价是一条不变量**：`new_closure` 的第四格**从此不是形参个数本身**——
所以**任何看这一格的地方都要先摘位**（今天只有这一处读它）。

**闭包要挂上 `Function.prototype`**（第 228 轮）——这是**所有脚本函数**出生的那一道门
（降级层每个函数声明 / 函数表达式 / 箭头 / 方法都发 `new_closure`，见
`typescript-exec/lowering.xl.md`）。

**为什么在这里、不在建库层**：`Function.prototype.call` / `apply` / `bind` 是**属性读**
（`greet.call`）——走的正是「接收者自己的 `Proto` 沿链找」那条路
（`props.xl.md` 的 `GetProperty`）。闭包算 `IsObject()`、也带着一格 `Proto`，
**只是从来没有谁给它填过**——于是 `typeof greet` 是 `"function"` 而
`typeof greet.call` 是 `"undefined"`，调它报的是
`calling a non-closure value`（那句话听起来像调用写错了，其实是**这一格没人填**，
与第 150 轮数字 / 布尔那两格的原型**同一个形状**）。

**为什么收在这一处而不是 `rt.xl.md` 的 `RtNewClosure`**：`rt` 层拿不到 `Protos`
（依赖方向是 `props → rt`，`Protos` 住在 `props`）——硬塞进去就是一次分层倒置。
`Protos` 是**这台机器**的，而这一处正好有它。

**`Protos` 还没装时不动**（与 `DoNew` 的 `Object` 那一格同一条口径：
没接上时不说谎，只是不特殊）。

```ts
// **第四格的最低五位是「这是一个类」「这是严格代码」「这是松散普通函数」
// 「这是生成器」「这是 async」**（第 613 / 620 / 709 / **730** 轮，见上面那一段）。
// **第三位（值 4）是第 709 轮添的**：它决定这个闭包带不带 `arguments` / `caller`
// 那两格「受限属性」（`HeapClosure.HasRestricted`）。
// **第四、五位（值 8 / 16）是第 730 轮添的**：`HeapClosure.IsGenerator` / `IsAsync`，
// 它们决定**这个函数值的原型是哪一格**（见下面挑原型那一段）——位宽从三位加到五位，
// 于是形参个数那一半的**步长从 8 变成 32**（降级层 `EmitClosure` 那一处**同步**改，
// 两边是同一份规约的两半）。
const isClass = (arity & 1) !== 0;
const isStrict = (arity & 2) !== 0;
const isRestricted = (arity & 4) !== 0;
const isGenerator = (arity & 8) !== 0;
const isAsync = (arity & 16) !== 0;
const paramCount = (arity - (arity & 31)) / 32;
const created = this.Guard(() => RtNewClosure(this.Room(), this.Table, env, code,
  paramCount, 0));
// **`Guard` 可能什么都没造出来**（room 不够时它把状态置成 `OutOfMemory` 并给 `undefined`）——
// 那种情况下再去读 `Ref` 会撞上「这不是一个引用值」，而那句话离现场很远。
if (!created.IsRef()) return created;
if (isClass) {
  // **类那一位落进闭包自己那一格**（第 613 轮）：`console.log(class C {})` 要印
  // `[class C]`（`inspect.xl.md` 读的正是这一格）。
  this.Table.Get(created.Ref).AsClosure().IsClass = true;
}
if (isStrict) {
  // **严格那一位落进闭包自己那一格**（第 620 轮）：调用点要拿它决定
  // 「没有接收者时 `this` 给谁」（见 `DoCallValue` 那一支）。
  this.Table.Get(created.Ref).AsClosure().IsStrict = true;
}
if (isRestricted) {
  // **受限属性那一位落进闭包自己那一格**（第 709 轮）：`props.xl.md` 的读路径
  // 与 `Object.getOwnPropertyNames` 各要问它一次（见 `HeapClosure.HasRestricted`）。
  this.Table.Get(created.Ref).AsClosure().HasRestricted = true;
}
if (isGenerator) {
  // **生成器那一位落进闭包自己那一格**（第 730 轮）：`inspect.xl.md` 印
  // `[GeneratorFunction: g]` 就是读它；底下挑原型那一趟也要它。
  this.Table.Get(created.Ref).AsClosure().IsGenerator = true;
}
if (isAsync) {
  // **`async` 那一位**（第 730 轮）：与生成器那一位**挨着**，两处一起读。
  this.Table.Get(created.Ref).AsClosure().IsAsync = true;
}
const protos = this.Protos;
if (protos !== null && protos.Function > 0) {
  // **这个函数值以哪个原型出生**（第 730 轮）——**JS 里是哪一档、就看这两位**：
  // `function*` 的原型是 `%GeneratorFunction.prototype%`、`async function` 是
  // `%AsyncFunction.prototype%`、`async function*` 是**第三个**
  // `%AsyncGeneratorFunction.prototype%`，其余才是 `Function.prototype`。
  //
  // **为什么这件事不能「反正都是函数」**：`Object.prototype.toString` 的标签
  // **只**从「原型链上那一格 `Symbol.toStringTag`」来（规范的第一步就是取 `@@toStringTag`）——
  // 本仓原来所有闭包**一律**指 `Function.prototype` ⇒ 四档全给 `"[object Function]"`
  // （**静默错值**：`function* g(){}` 在 Node 里是 `"[object GeneratorFunction]"`）。
  // `.constructor.name`（给 `"GeneratorFunction"` 那一格）也在这条链上，
  // 所以**改原型一处，两个症状一起收**。
  //
  // **没有那一格时退回 `Function`**（与 `DoNew` 的 `Object` 那一格同一条口径：
  // 没接上时不说谎、只是不特殊）——`protos` 是**语言层填的**，
  // 手工造的 `Protos`（`tests/runtime/check.mjs` 那几处）里它们是 `0`。
  let functionProto = protos.Function;
  if (isGenerator && isAsync && protos.AsyncGeneratorFunction > 0) {
    functionProto = protos.AsyncGeneratorFunction;
  } else if (isGenerator && protos.GeneratorFunction > 0) {
    functionProto = protos.GeneratorFunction;
  } else if (isAsync && protos.AsyncFunction > 0) {
    functionProto = protos.AsyncFunction;
  }
  this.Table.Get(created.Ref).Proto = functionProto;
}
// **名字那一格**：只有真给了字符串才写——`undefined` 保持**匿名**
//（`Name` 那一格的约定是「句柄 0 表示匿名」，所以这里不能拿 `undefined` 的
// `Ref` 去写：那是个别的值）。
if (name.IsString()) {
  this.Table.Get(created.Ref).AsClosure().Name = name.Ref;
}
// **源码那一格**（第 334 轮）：与名字**同一条规矩**——只有真给了字符串才写
//（`0` 表示「没有」，宿主那两档的字面由 `FunctionSourceText` 现造）。
// **它进的是 `RtNewClosure` 的第五格**：那一格是**字符串句柄**、不是常量池下标
//（`heap.xl.md` 的 `Source` 那一段写着为什么）。
if (source.IsString()) {
  this.Table.Get(created.Ref).AsClosure().Source = source.Ref;
}
return created;
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
