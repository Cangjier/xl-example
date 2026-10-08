# dependencies
```xl
import { Template } from "./core/syntax/templates/template.xl.md"
import { TextDocument } from "./typescript/text-document.xl.md"
import { TextContext } from "./typescript/text-context.xl.md"
import { projectRoot, ToJsonText } from "./typescript/print-ast-common.xl.md"
import { Lowering, LoweredModule, CapabilityLookup } from "./typescript-exec/lowering.xl.md"
import { Bindings, LookupOf } from "./typescript-exec/bindings.xl.md"
import { GlobalNames, BuildGlobals, ClockNow, TextFrom, LogSink, NewError, NewErrorLike, SymbolToString } from "./typescript-exec/builtins/globals.xl.md"
import { ValueText } from "./typescript-exec/builtins/text.xl.md"
import { InstallBuiltins, InvokeWithSink, BuiltinSlots, RaiseFromHost, HostErrorText } from "./typescript-exec/builtins/install.xl.md"
import { NeverCall } from "./typescript-exec/builtins/array.xl.md"
import { Value, ValueTag } from "./runtime/value.xl.md"
import { ErrorKindType, ErrorKindRange } from "./runtime/vm.xl.md"
import { HeapTable } from "./runtime/heap.xl.md"
import { RoomChecker } from "./runtime/rt.xl.md"
import { SetProperty } from "./runtime/props.xl.md"
import { IdTable, Encode } from "./runtime/ir-verify.xl.md"
import { RtOpCount } from "./runtime/ir.xl.md"
import { Vm, VmStatus } from "./runtime/vm.xl.md"
import { Host, HostOutcome, Limits } from "./runtime/host-abi.xl.md"
import { LinkPrograms } from "./runtime/link.xl.md"
import { DefineAccessorId } from "./typescript-exec/builtins/install.xl.md"
```

# namespace cangjie

**运行器：把若干份 TypeScript 源文装起来跑一遍。**

**为什么需要这一层**（而不是把这段写进 `typescript-exec/`）：分层是硬的——

| 层 | 它认识什么 | 它**不认识**什么 |
| --- | --- | --- |
| `runtime/` | 值、堆、帧、IR、宿主 ABI | 任何语言的字符串与语法 |
| `typescript-exec/` | 降级规则、标准库 | **解析器**（它收的是投影后的 `AstNode`） |
| `typescript/` | 语法与投影 | 引擎、语言层 |

只有**这一层**允许同时 import 三者——它就是「把客户程序装起来」的那一层。
所以它放在仓库根上，与 `cjcli.xl.md`（同一个角色：命令行驱动）并列。

**它做的是判据里一直在手装的那一串**（第 68～72 轮的 P0 判据就是它的人工版）：
解析 → 降级 → **链接** → 装载 → 求值第 0 份 → 用它（以及更早那些）的导出逐份喂后面每一份 →
调最后一份里的入口 → 把结果交回去。

**它不替宿主做决定**：能力调用（`.d.ts` 里那些名字）先问**宿主给的 `RunHost`**；
宿主答 `null` 才落到标准库。**时间、日志、能力都在宿主手里**——这一层不碰。

**失败的收敛**：装载被拒、脚本抛了、撞上预算，都变成 `RunResult` 的一个结局 + 一句话，
**不往外抛**（调用方按 `Outcome` 分支）。

**唯一的例外是「语言层」那两种失败**（写在明处，别以为它不抛）：源文**解析不了**
（`SyntaxException`）与**降级不了的构造**（`unimplemented: …`）会**原样抛出来**。
理由：它们**不是脚本的结局**——那时程序根本还没被装起来，
硬塞进 `HostOutcome` 会让「一次脚本调用的结局」这张表多出一个不属于它的成员
（那个枚举是跨目标的契约，`host-abi.xl.md`）。**命令行接住它们**（`RunMain`），
判据也一样：`try` 里调运行器。

# type RunHost = (room:RoomChecker, id:number, self:Value, args:Array<Value>)=>Value | null

**宿主对能力调用的回答**：认这个号就给一个值，不认就给 `null`（落到标准库去）。

`room` 先给出来是**规矩**：宿主函数要分配就得先问预算（`host-abi.xl.md` 的调用通道）。

# type PrepareArgs = (table:HeapTable, machine:Vm)=>Array<Value>

**在入口开帧之前，由宿主造出入口的实参。**

**为什么要有它**：有些实参只能在「装起来之后」造——最典型的是 **async 入口要的那个承诺**
（承诺住在堆里，而堆是运行器建的）。宿主在这里拿到表与机器，就能自己造。
**这也把「谁是事件循环」这件事说清楚了：宿主才是。**

# type RunOptions = { Input:string; Entry:string; Help:boolean; Version:boolean; Batch:string; Error?:string }

**命令行的参数**（与 `cjcli.xl.md` 的 `CliOptions` 同一个写法）。

`Entry` 空串 = **只求值模块、不调导出**——那正是「**直接执行一个 `.ts` 文件**」的默认：
文件顶层的语句跑完就算跑完，与 `node file.ts` 同一条口径。

# class RunRequest

**一次运行要什么。**

## field Sources:Array<string> = []

模块的源文，**按依赖顺序**（第 0 份是入口模块，后面的都能引用前面的导出）。

## field Capabilities:Array<string> = []

`.d.ts` 里声明、**源码里没声明**的那些名字（按能力号调宿主）。

## field Entry:string = ""

最后一份模块里要调的那个导出名（空串就不调，只把模块都求值完）。

## field EntryArgs:Array<Value> = []

调入口时给的实参。**承载体是 `Value`**（运行期的值），所以调用方先自己造：
`async` 的入口要的就是一个**承诺**——这正是「宿主是事件循环」那句话的落点。

## field DriveLoop:bool = false

**同步宿主可以把「推进微任务」交给运行器做**（判据、命令行就是这种宿主）。

**真正的异步宿主不该用这个**：它应当自己当事件循环——挂起时 `RunSources` 会带着
`Parked` 回来，它推进之后接着跑。要做到这一点，它需要的是下面两样：
`Prepare`（造入口实参，比如承诺）+ `RunResult` 里的机器与表（兑现、推进）。

## field Prepare:PrepareArgs | null = null

**装起来之后、入口开帧之前，由宿主造入口实参**（给了它就**不用** `EntryArgs`）。

## constructor:()=>void

造一个空的请求。

```ts
this.Sources = [];
this.Capabilities = [];
this.Entry = "";
this.EntryArgs = [];
this.DriveLoop = false;
this.Prepare = null;
```

# class RunResult

**一次运行的结果。** 三种顺利的结局都在这里：跑完了（`Ok`）、挂起了（`Parked`，
等宿主推进微任务）、出事了（装载被拒 / 脚本抛了 / 撞上预算——`Message` 说清是哪一种）。

## field Outcome:HostOutcome = HostOutcome.Ok

结局（与宿主 ABI 用同一套取值）。

## field Message:string = ""

给人看的一句话；顺利时是空串。

## field Value:Value = new Value()

入口的返回值（没有入口、或者挂起了，就是一个默认值——**调用方先看 `Outcome` 再用它**）。

## field Error:Value = new Value()

**脚本抛出来的那个值**（`Outcome` 是 `ScriptThrew` 时才有意义，别的结局里是空的）。

**为什么运行器要把它交出来**：宿主能对它做的事只有「打印」或「按形状分派」，
而 `Message` 是**给机器看的一句话**（`the script threw`）——真正的信息在这个值里
（`throw new Error('boom')` 的那句 `boom`）。命令行就是靠它打出一行**可读**的报错。
**它是根**：抛出的值留在 `Vm.Pending` 上，而那一格在回收器的根集里
（`vm.xl.md`）——所以只要 `Machine` 还在，它就不会被回收掉。

## field Machine:Vm | null = null

**这次运行用的机器**（挂起时尤其需要它：宿主用它兑现承诺、推进微任务、再取结果）。

**把机器交出来是有意的**：宿主本来就是环境的主人——**宿主才是事件循环**。
运行器只负责「把程序装起来」，不假装自己知道宿主打算怎么驱动它。

## field Table:HeapTable | null = null

**这次运行用的表**（宿主造承诺要用它：`table.CreatePromise(...)`）。

## constructor:()=>void

造一个空结果。

```ts
this.Outcome = HostOutcome.Ok;
this.Message = "";
this.Value = new Value();
this.Error = new Value();
this.Machine = null;
this.Table = null;
```

# method ParseToProjection:(content:string, filePath:string)=>any

**源文 → 投影后的 AST**（`AstNode`，语言层收的就是它）。

与 `cjcli.xl.md` 的 `CjcliParseTsAst` 走**同一条流水线**（造模板 → 包文档 → 驱动解析 →
`projectRoot` → JSON 文本 → 解析回对象）。**这里不新开第二条解析路径**：
命令行打出来的、判据拿到的、运行器装的，必须是同一棵树。

```ts
const template = new Template();
const document = new TextDocument(content);
document.FilePath = filePath;
const context = new TextContext(template);
context.Process(document);
const projected = projectRoot(context.Root.ToList(), content);
return JSON.parse(ToJsonText(projected));
```

# method Units:(text:string)=>Array<number>

字符串 → 码元（**代码单元**，不是字节）：运行时这边要的是 `Array<int>`。

```ts
const out: number[] = [];
for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
return out;
```

# method RunSources:(request:RunRequest, sink:LogSink, answer:RunHost)=>RunResult

**装起来跑一遍。** 顺序见文首那张表；每一步的失败都收敛成 `RunResult`，不往外抛。

**导出怎么进下一份模块的环境**：导出数组是**按位置**的（没有名字），
而名字在模块自己的 `Entries` 里——所以这里按名字逐个搬
（`ExportOf(名字)` 给的就是它在导出数组里的下标）。

```ts
const result = new RunResult();
if (request.Sources.length === 0) {
  result.Message = "没有源文";
  return result;
}
const table = new HeapTable();
const bindings = new Bindings(64);
for (let i = 0; i < request.Capabilities.length; i++) {
  bindings.Register(request.Capabilities[i]);
}
// **能力表要连「语言内部辅助」那一段一起开够**（700..799，见 `builtins/install.xl.md`）：
// 应用能力从 64 起按登记顺序排，而内部辅助号是**固定号**（不占登记名额）——
// 所以两者取较大者，再留一格余量。开小了报的是 `capability id is out of range`，
// 而那句离现场很远（它说的是装载数字，不是「谁没注册」）。
const byCapability = request.Capabilities.length + 1;
// **内建段开多少由语言公布**（第 111 轮）：辅助号不在脚本里，宿主无从得知；开小了注册会静默失败。
const byLanguage = BuiltinSlots();
const ids = new IdTable(RtOpCount, byCapability > byLanguage ? byCapability : byLanguage);
const modules: LoweredModule[] = [];
for (let i = 0; i < request.Sources.length; i++) {
  const lowering = new Lowering(request.Sources[i]);
  lowering.DeclareGlobals(GlobalNames());
  if (request.Capabilities.length > 0) {
    lowering.DeclareCapabilities(LookupOf(bindings));
  }
  modules.push(lowering.LowerModule(ParseToProjection(request.Sources[i], "m" + i + ".ts"), ids));
}
const programs = [];
for (let i = 0; i < modules.length; i++) {
  programs.push(modules[i].Program);
}
const linked = LinkPrograms(programs);
// **步数预算只有一个答案**（第 372 轮修的）：这里原来**写死 1000000**，
// 而宿主那一侧宣告的是 `Limits.Default()`（`10000000`，`host-abi.xl.md`）——
// 于是两份上限同时在，**小的那一份说了算**，而它离现场很远
//（症状是「一份普通 `.ts` 跑到一半报 `step budget exhausted`」，
//  看起来像脚本自己有问题——第 371 轮那批端到端语料里当场量到 3 条：
//  两万次分配的 churn、3999 次罗马数字换算、一个实操规模的排序）。
// **改成从宿主那一份取**：上限仍然是一层安全（`vm.xl.md` 第 10 节第 4 层），
// 只是**不再有两个数**（两个数的账本仓最贵：改了一个、另一个还在原地）。
const machine = new Vm(table, 1 << 20, Limits.Default().StepBudget);
const host = new Host(machine, Limits.Default());
// **把机器与表交给宿主**（见 `RunResult` 那两个字段的说明）：宿主才是事件循环。
result.Machine = machine;
result.Table = table;
const bytes = Encode(linked, ids);
if (bytes === null) {
  result.Message = "ENCODE_FAILED";
  return result;
}
const loaded = host.Load(bytes, ids);
if (loaded.Outcome !== HostOutcome.Ok) {
  result.Outcome = loaded.Outcome;
  result.Message = "装载：" + loaded.Message;
  return result;
}
const protos = machine.Protos;
if (protos === null) {
  result.Message = "NO_PROTOS";
  return result;
}
host.DeclarePrototypeKey(Units("prototype"));
// **符号上的 `description` 也走同一条**（第 241 轮）：符号不是对象
//（没有属性表、没有原型那一格），所以那一格**只能由引擎在 `get_prop` 处特判**——
// 而引擎不认识「description」这几个字母，名字由这里给（与上一行一字不差）。
host.DeclareDescriptionKey(Units("description"));
// **符号上的 `toString` 也走同一条**（第 277 轮）——它是 `DeclareDescriptionKey` 的**兄弟**，
// 差别只有「交出去的是一个**能被调的东西**」：所以这一句多带一个**能力号**
//（`SymbolToString`，在 `globals.xl.md` 里）。引擎不认识那个号，与不认识
// 「description」这几个字母是同一件事。
host.DeclareSymbolToString(Units("toString"), SymbolToString);
// **建库与宿主要在第 0 份模块求值之前装好**（第 119 轮改的顺序）：模块**顶层的语句**
// 也是脚本，它一样会 `console.log` / `arr.push` / 造对象字面量的访问器——
// 原来这四步排在 `Evaluate` **之后**，于是「直接跑一个 .ts 文件」这种最普通的形状
// （顶层就有日志）报的是 `calling a host function with no host installed`，
// 而那句话听起来像宿主配置错了，其实是**装晚了**。
// 顺带把「能力注册」也提到前面：注册只认**已装载**的那张表（`host.Load` 过了），
// 与求值没有先后关系。
InstallBuiltins(host, protos);
// **错误工厂**（第 127 轮）：rt 层的失败（`a + b` 遇到对象那种）也变成**脚本接得住**的异常——
// 用的是**同一个** `NewError`，所以「宿主函数失败」与「rt 层失败」在脚本看来是一种东西。
// 少了这一行，`try { left + right } catch { … }` 里的 `catch` 走不到（判据现场那一条）。
//
// **`kind` 那一格是第 139 轮加的**：引擎报「这是哪一类失败」，
// **这一行把它翻成名字**（`ErrorKindType` → `TypeError`）——
// 于是 `try { null.y } catch (e) { e instanceof TypeError }` 与 Node 一致。
// **引擎仍然不认识 `"TypeError"` 这几个字母**（那一格是数字，见 `ErrorKindType`）。
//
// **`ErrorKindRange` → `RangeError`** 是第 228 轮补的：理由与 `ErrorKindType` 那一条
// 一字不差——引擎自己认出来的那一档（`Guard` 现在按**宿主异常的类**认）
// 也要翻成正确的族，不然 `"x" + Symbol()` 那一抛（`TypeError`）在脚本里
// 会变成一个普通的 `Error`。
host.Machine.SetErrorFactory((kind, text) => {
  if (kind === ErrorKindType) {
    return NewErrorLike(host.Machine.Room(), table, protos, protos.TypeError, "TypeError", text, true);
  }
  if (kind === ErrorKindRange) {
    return NewErrorLike(host.Machine.Room(), table, protos, protos.RangeError, "RangeError", text, true);
  }
  return NewError(host.Machine.Room(), table, protos, text);
});
host.InstallHost((target, self, args, room, constructThis) => {
  const id = table.Get(target.Ref).AsHost().CapabilityId;
  // **宿主这条通道的兜底**（第 121 轮）：内建（或客户能力）失败时，把**宿主异常**
  // 抬成**脚本异常**——脚本的 `try { … } catch { … }` 才接得住。
  // 少了这一层，`try { Object.keys(null) } catch {}` 里的 `catch` **永远走不到**：
  // 宿主异常直接冒出 `Run()`，整份程序以「语言层错误」收场（判据现场就是这么红的）。
  try {
    const answered = answer(room, id, self, args);
    if (answered !== null) return answered;
    // **第 199 轮加了两样服务**（与 `schedule` / `settle` 同一个形状）：
    // `IteratorDrainer()` 是「把可迭代物走完、收成数组」（生成器那一条）、
    // `RootKeeper()` 是「把语言层造的中间数组挂进根集」——
    // 后者是**实测逼出来的**：6 万项的 `[...o]` 在 `invalid handle` 上炸过。
    // **`CallFailed` 也要包一层箭头函数**（第 228 轮）：与方法引用**同一条纪律**
    //（`Scheduler()` 那一段实测过：方法引用**不带接收者**，到了建库层手里 `this` 是
    // `undefined`，报的是 `Cannot read properties of undefined`——那句话离现场很远）。
    // **第 285 轮又加了两样**（同一条形状、同一条纪律）：
    // `Invoker()` 是「**同步**调一个脚本值」（`new Promise(执行器)` 那一格）——
    // `call` 那个通道是**反的**（宿主被调），内建主动调要另给一格；
    // `ThrownTaker()` 是「刚才那一调抛了吗、抛的是什么」（执行器自己抛 ⇒ 结果承诺被拒绝）。
    // 与前面几样一样：**方法引用会丢 `this`**，两样都包一层箭头函数。
    return InvokeWithSink(room, table, protos, id, self, args, sink, host.Machine.Native(), host.Machine.Scheduler(), host.Machine.Settler(), host.Machine.IteratorDrainer(), host.Machine.RootKeeper(), () => host.Machine.CallFailed(), host.Machine.HostConstructing, host.Machine.Invoker(), host.Machine.ThrownTaker(), constructThis);
  } catch (error) {
    // **抬不动就原样冒出去**（`RaiseFromHost` 给假：多半是连错误对象都开不出来）——
    // 响亮地失败，比假装抛了一个空错误好。
    if (!RaiseFromHost(host.Machine, error)) throw error;
    return Value.Undefined();
  }
});
for (let i = 0; i < request.Capabilities.length; i++) {
  const id = 64 + i;
  host.Register(id, Value.FromRef(ValueTag.HostRef, table.CreateHostRef(id, 0)));
}
// **语言内部辅助也要注册**：它们走的是同一条 `host_call`，而引擎那一格必须**真的**是
// `HostRef`（`vm.xl.md`：能力表就是白名单本身）——不注册就报 `capability is not registered`。
// （`InstallBuiltins` 已经登记过它一次，这里是**幂等的**第二遍：客户宿主自己拼装载路径时
// 漏掉建库层也能跑，代价只是多一次 `Register`。）
host.Register(DefineAccessorId,
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(DefineAccessorId, 0)));
const first = host.Evaluate([BuildGlobals(machine, protos, sink)]);
if (first.Outcome !== HostOutcome.Ok) {
  result.Outcome = first.Outcome;
  result.Error = first.Error;
  result.Message = "第 0 份模块求值：" + first.Message;
  return result;
}
const all: Value[] = [];
let exports = machine.Result;
machine.Retain(exports);
all.push(exports);
let entryBase = modules[0].Program.Functions.length;
for (let i = 1; i < modules.length; i++) {
  const env = BuildGlobals(machine, protos, sink);
  machine.Retain(env);
  for (let j = 0; j < i; j++) {
    const entries = modules[j].Entries;
    for (let k = 0; k < entries.length; k++) {
      const name = entries[k].Name;
      const index = modules[j].ExportOf(name);
      if (index < 0) continue;
      const key = Value.FromString(table.CreateString(Units(name)));
      const value = table.Get(all[j].Ref).AsArray().GetAt(index);
      SetProperty(machine.Room(), NeverCall, table, env, key, value);
    }
  }
  if (!machine.Start(entryBase, [env])) {
    result.Outcome = HostOutcome.OutOfMemory;
    result.Message = "第 " + i + " 份模块开不了帧（预算不够）";
    return result;
  }
  machine.Run();
  // **结局一律由 `Classify` 翻**（第 119 轮改）：这里原来是
  // `if (machine.Status !== VmStatus.Halted) → OutOfSteps`——脚本**抛出**也走那一支，
  // 于是宿主看到的是「步数用尽 / 没跑完」**两个都错**的说法，抛出的值也丢了。
  // `Classify` 的顺序本来就是「异常与限额先判」（`host-abi.xl.md`），照它翻就对了。
  const evaluated = host.Classify();
  if (evaluated.Outcome !== HostOutcome.Ok) {
    result.Outcome = evaluated.Outcome;
    result.Error = evaluated.Error;
    result.Message = "第 " + i + " 份模块：" + evaluated.Message;
    return result;
  }
  exports = evaluated.Value;
  machine.Retain(exports);
  all.push(exports);
  entryBase = entryBase + modules[i].Program.Functions.length;
}
if (request.Entry !== "") {
  const last = modules[modules.length - 1];
  const index = last.ExportOf(request.Entry);
  if (index < 0) {
    result.Message = "没有叫 " + request.Entry + " 的导出";
    return result;
  }
  const array = table.Get(all[all.length - 1].Ref).AsArray();
  // **入口实参**：宿主可以用 `Prepare` 在**这时候**造（承诺只能在装起来之后造）。
  const entryArgs = request.Prepare === null ? request.EntryArgs : request.Prepare(table, machine);
  if (!machine.StartClosure(array.GetAt(index), entryArgs)) {
    result.Outcome = HostOutcome.OutOfMemory;
    result.Message = "入口开不了帧（预算不够）";
    return result;
  }
  machine.Run();
  // **同步宿主**：把微任务排空（挂起的帧在 `DrainMicrotasks` 里被恢复并跑完）。
  while (request.DriveLoop && machine.Frames.Depth() === 0 && machine.Microtasks.length > 0) {
    machine.DrainMicrotasks();
  }
  // **微任务里抛出来的也要收敛**（第 119 轮补）：原来这一段只检查了「挂起」——
  // 一个在 `await` 之后抛出的异常会让宿主拿到 `Ok` + 一个空结果（最坏的那种：静默）。
  const invoked = host.Classify();
  if (invoked.Outcome === HostOutcome.ScriptThrew || invoked.Outcome === HostOutcome.OutOfSteps
    || invoked.Outcome === HostOutcome.OutOfMemory) {
    result.Outcome = invoked.Outcome;
    result.Error = invoked.Error;
    result.Message = invoked.Message;
    return result;
  }
}
// **挂起的判据是 `Finished`，不是微任务队列**（`host-abi.xl.md` 里宿主就是这么判的）：
// 挂在**未兑现**的承诺上时，帧在承诺的反应表里、**队列反而是空的**——
// 拿队列当信号会把它错判成「跑完了」（第 76 轮踩的）。
if (!machine.Finished) {
  result.Outcome = HostOutcome.Parked;
  result.Message = "挂在承诺上（宿主兑现并推进微任务之后再取结果）";
  return result;
}
result.Value = machine.Result;
return result;
```

# method RunVersion:()=>string

**命令行的版本号**。

与 `cjcli` **同一个号**：这一层还没有独立的版本线，各报各的会让人以为装了两套东西。
版本号写死在规范里（不是从 `package.json` 读）——产物要能脱离这个仓跑。

```ts
return "0.1.0";
```

# method RunUsage:()=>string

**用法说明**。与 `cjcli` 同一条口径：**产物自带它**，命令行不必去查文档。

**为什么把「与 node 逐字节对拍」写进用法里**：这是这个命令行的**验收口径**，
不是附注——**stdout 只装脚本自己的输出**（`console.log` 一行一条），
报错走 stderr、退出码 1；所以 `node file.ts` 与 `tsrun file.ts` 的 stdout 可以直接 diff。
**stderr 的形态不作承诺**（`node` 会打栈帧，这里没有栈帧可打）。

```ts
return [
  "tsrun — 直接执行 TypeScript 源文件（真解析器 → 降级 → IR → VM）",
  "",
  "用法：",
  "  tsrun <文件.ts>              跑文件顶层的语句，stdout 与 node <文件.ts> 逐字节相同",
  "  tsrun <文件.ts> -e <导出名>  顶层跑完之后，再调这个导出（无参）",
  "  tsrun -h, --help             打印本说明",
  "  tsrun -v, --version          打印版本",
  "",
  "约定：",
  "  console.log 一行一条，进 stdout；脚本抛出 / 装载被拒 / 撞上限额都走 stderr 并置退出码 1。",
  "",
].join("\n");
```

# method RunParseArguments:(args:Array<string>)=>RunOptions

**命令行 → `RunOptions`**（与 `cjcli` 的 `CjcliParseArguments` 同一个形状）。

**未知选项要响亮**：静默忽略一个 `--entryy` 会让用户以为它生效了——
而结果是「入口没调」这种**看起来像程序自己有问题**的现象。

```ts
const options: RunOptions = { Input: "", Entry: "", Help: false, Version: false, Batch: "" };
let index = 0;
while (index < args.length) {
  const item = args[index];
  if (item === "-h" || item === "--help") {
    options.Help = true;
    index++;
    continue;
  }
  if (item === "-v" || item === "--version") {
    options.Version = true;
    index++;
    continue;
  }
  if (item === "-e" || item === "--entry") {
    if (index + 1 >= args.length) {
      options.Error = item + " 需要一个导出名";
      return options;
    }
    options.Entry = args[index + 1];
    index = index + 2;
    continue;
  }
  // **`--batch 清单.json`：一个进程跑多条用例**（第 319 轮，用户口径
  // 「一次 tsrun，一个进程跑多个 case，同时起 CPU 核心数那么多个」）。
  // 清单是 `[{id, path}]`；每一条的 stdout 被**逐条捕获**、按 JSON 一行一条交出去
  // （见 `RunBatch`）——所以这个选项与 `Input` 是**两选一**。
  if (item === "--batch") {
    if (index + 1 >= args.length) {
      options.Error = item + " 需要一个清单文件";
      return options;
    }
    options.Batch = args[index + 1];
    index = index + 2;
    continue;
  }
  if (item.startsWith("-") && item !== "-") {
    options.Error = "未知选项 " + item;
    return options;
  }
  if (options.Input !== "") {
    options.Error = "只接受一个输入文件";
    return options;
  }
  options.Input = item;
  index++;
}
return options;
```

# method RunReadFile:(path:string)=>string

**读一份源文，去掉 BOM**——与 `cjcli` 同一条口径（BOM 不是源码的一部分，
留着它会让第一个 token 变成一个看不见的字符）。

```ts
const text = RunNode.Fs().readFileSync(path, "utf8");
return text.charCodeAt(0) === 0xfeff ? text.substring(1) : text;
```

# method RunFileExists:(path:string)=>bool

```ts
return RunNode.Fs().existsSync(path) && RunNode.Fs().statSync(path).isFile();
```

# method RunAbsolutePath:(path:string)=>string

```ts
return RunNode.Path().resolve(path);
```

# method RunWrite:(text:string)=>void

**标准输出**（脚本的日志走这里：**只装脚本自己的输出**）。

```ts
process.stdout.write(text);
```

# method RunWriteError:(text:string)=>void

**标准错误**（命令行自己的话走这里——装载被拒、脚本抛出、找不到文件）。

```ts
process.stderr.write(text);
```

# method RunErrorText:(error:any)=>string

**宿主异常 → 一句话**（读文件失败、解析失败、降级期「还没实现的构造」那几种）。

**它就是 `HostErrorText`**（`builtins/install.xl.md`）——那一条同时服务「内建失败被抬成
脚本异常」那条路。**两处各写一套**会让同一种异常在两条路上得到两种文字，
所以这里只留一层皮。

```ts
return HostErrorText(error);
```

# method RunDescribe:(table:HeapTable, value:Value)=>string

**脚本抛出来的值 → 一句话**。

**第 124 轮之后它简单多了**：语言层有了「任意值 → 文本」（`text.xl.md` 的 `ValueText`），
所以**浮点与数组也照常渲染**（`throw 1.5` 给 `"1.5"`、`throw [1, 2]` 给 `"1,2"`）——
原来那两句「一个非整数（本层没有它的文本形态）」/「一个对象（没有 message 属性）」
现在只剩后者有意义。

**两条规矩照旧**：
- **对象先看 `message` 数据属性**（`{ message: "boom" }`、`Error` 实例）——
  **访问器跳过**（读它要重入执行器，而这里只是给人打一行字）；
- **它不抛**（报错路径上再抛一次，原来的错就没了）——所以
  **函数 / 闭包 / 符号 / 宿主值**这几个 `ValueText` 也不认的形状，
  在这里先接住并给一句「说得出形状」的话。

```ts
if (value.Tag === ValueTag.Object) {
  const item = table.Get(value.Ref);
  for (let i = 0; i < item.Props.length; i++) {
    const property = item.Props[i];
    if (property.IsAccessor()) continue;
    const keyValue = table.Get(property.Key);
    if (keyValue.Tag !== ValueTag.String) continue;
    if (TextFrom(table, Value.FromString(property.Key)) !== "message") continue;
    return TextFrom(table, property.Value);
  }
  return ValueText(table, value);
}
if (value.Tag === ValueTag.Function || value.Tag === ValueTag.Closure
  || value.Tag === ValueTag.Symbol || value.Tag === ValueTag.HostRef) {
  return "一个值（本层没有它的文本形态）";
}
return ValueText(table, value);
```

# method RunAnswer:(room:RoomChecker, id:number, self:Value, args:Array<Value>)=>Value | null

**命令行宿主的回答**：只接 `ClockNow`（`Date.now()`）这一号，别的能力一律给 `null`
（＝「本宿主没有这一号」⇒ 建库层响亮地报 `unimplemented: global builtin <id>`）。

**为什么只接它**：这个命令行**不接客户能力**（`.d.ts` 那些名字在源码里没有声明，
降级期自己就会报「未知名字」，见 `RunMain` 那一段）——而**时钟不是客户能力**：
`Date.now()` 是标准库的一格，按设计**只能由宿主回答**（`globals.xl.md` 的 `ClockNow`：
建库层刻意不实现它，否则「时间从哪来」就不由宿主说了算）。

**这里取真钟**：`Date.now()` 的语义就是「现在」。判据那边给固定值是为了可复现，
命令行要的是正常用法——覆盖度矩阵里用到它的那一条只打 `Date.now() > 0`（不打印读数），
所以真钟不会让读数不可复现。

```ts
if (id === ClockNow) {
  return Value.FromDouble(Date.now());
}
return null;
```

# method RunMain:(args:Array<string>)=>void

**命令行入口**：读文件 → 装起来跑一遍 → 按结局定退出码。

**它只做三件事**，每一件都写在明处：

1. **日志到 stdout**：`console.log` 一次调用一行（`LogSink` 那一段定的粒度），
   行尾由**这里**补——标准库不替宿主决定输出形态；
2. **报错到 stderr、退出码 1**：`ScriptThrew` 打印**抛出的那个值**（`RunDescribe`），
   别的失败打印 `Message`（装配 / 装载 / 限额那几种）；
3. **同步宿主自己推微任务**（`DriveLoop`）——命令行没有别的事件循环。

**为什么 `Entry` 默认是空**：`node file.ts` 跑的是**顶层语句**，
不是「找一个叫 main 的导出」；要调导出就显式 `-e`。

```ts
const options = RunParseArguments(args);
if (options.Help) {
  RunWrite(RunUsage());
  return;
}
if (options.Version) {
  RunWrite(RunVersion() + "\n");
  return;
}if (options.Error !== undefined) {
  RunWriteError("tsrun: " + options.Error + "\n");
  process.exitCode = 1;
  return;
}
// **批量那一路先判**（第 319 轮）：它与 `Input` 是两选一（见 `RunParseArguments`）。
if (options.Batch !== "") {
  RunBatch(options.Batch);
  return;
}
if (options.Input === "") {
  RunWriteError("tsrun: 需要一个 .ts 文件（-h 看用法）\n");
  process.exitCode = 1;
  return;
}
const path = RunAbsolutePath(options.Input);
if (!RunFileExists(path)) {
  RunWriteError("tsrun: 找不到输入文件：" + options.Input + "\n");
  process.exitCode = 1;
  return;
}
let content = "";
try {
  content = RunReadFile(path);
} catch (error) {
  RunWriteError("tsrun: 读不了输入文件：" + RunErrorText(error) + "\n");
  process.exitCode = 1;
  return;
}
const request = new RunRequest();
request.Sources = [content];
request.Entry = options.Entry;
request.DriveLoop = true;
// **能力一律落到标准库**：这个命令行不接宿主能力（`.d.ts` 那些名字在源码里没有声明，
// 降级期就会响亮地报「未知名字」——不静默给 undefined）。
let result = new RunResult();
try {
  result = RunSources(request, (line) => {
    RunWrite(line + "\n");
  }, RunAnswer);
} catch (error) {
  // **解析与降级是语言层的报错，不是宿主结局**（见 `RunSources` 文首那张分层表：
  // 语言层不认识语法、引擎不认识语言）——所以它们**抛**出来，由调用方接住。
  // 命令行接住之后要做的只有一件：**说清是哪一层、哪个构造**，
  // 而不是把一串宿主栈倒给用户（那些帧里没有一个字是他写的）。
  RunWriteError("tsrun: 还没实现的构造或语言层错误：" + RunErrorText(error) + "\n");
  process.exitCode = 1;
  return;
}
if (result.Outcome !== HostOutcome.Ok) {
  if (result.Outcome === HostOutcome.ScriptThrew && result.Table !== null) {
    RunWriteError("tsrun: 脚本抛出：" + RunDescribe(result.Table, result.Error) + "\n");
  } else {
    RunWriteError("tsrun: " + result.Message + "\n");
  }
  process.exitCode = 1;
  return;
}
```

# method RunBatch:(manifestPath:string)=>void

**一个进程跑多条用例**（第 319 轮）——用户的口径是
「一次 tsrun（一个进程跑多个 case），同时起 CPU 核心数那么多个」。

**为什么它比「一个进程一条」快**：实测一条用例要起**两个** `node`，
而 `tsrun` 那一侧 ~265ms 里**大半是进程启动**（裸 `node -e 0` 就要 130ms）
——1111 条就是 1111 次启动。合成一批之后，**启动次数 = 批数**
（分 16 批就是 16 次），每条用例只剩**真正的解析 + 降级 + 执行**。

**每一批内部是串行的**（一批一个进程），所以提速靠的是**批与批并行**：
调用方起 `min(核数, …)` 个进程（`tests/coverage/run.mjs` 的 `--jobs`）。

**协议**（父进程按行读）：每跑完一条，**往 stdout 打一行 JSON**：
`{"id": …, "status": 0|1, "stdout": …, "stderr": …}`。
**用例自己的输出一律被 `sink` 捕获**（不落到 stdout）——
否则一行 JSON 里会混进用户的 `console.log`，父进程再也分不清哪一行是什么
（这正是「日志的形态由宿主决定」那条：`RunSources` 收的是一个 sink，命令行给它什么就写什么）。

**先出一行 `{"begin": true}`**：父进程拿它确认「这一批真的开跑了」——
批量模式最坏的一种失败是**父进程以为跑了、其实子进程早就死了**，
有这一行就分得清（`run.mjs` 用它决定要不要按单条重跑）。

**退出码**：批量模式**总是 0**（除非清单本身读不了）——
每一条的成败在它自己那一行里；某一批里有失败不该让整批的协议作废。

```ts
let manifestText = "";
try {
  manifestText = RunReadFile(RunAbsolutePath(manifestPath));
} catch (error) {
  RunWriteError("tsrun: 读不了清单：" + RunErrorText(error) + "\n");
  process.exitCode = 1;
  return;
}
const parsed = JSON.parse(manifestText);
const items: Array<any> = Array.isArray(parsed) ? parsed : [];
RunWrite(JSON.stringify({ begin: true, count: items.length }) + "\n");
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  const id = String(item.id);
  const lines: Array<string> = [];
  let status = 0;
  let failure = "";
  let content = "";
  try {
    content = RunReadFile(RunAbsolutePath(String(item.path)));
  } catch (error) {
    failure = "tsrun: 读不了输入文件：" + RunErrorText(error);
    status = 1;
  }
  if (status === 0) {
    const request = new RunRequest();
    request.Sources = [content];
    request.Entry = "";
    request.DriveLoop = true;
    let result = new RunResult();
    try {
      result = RunSources(request, (line) => {
        lines.push(line);
      }, RunAnswer);
    } catch (error) {
      // **与单条那一路说同一句话**（第 121 轮那条口径）：父进程拿到的 stderr
      // 与「一条一条跑」时**逐字相同**——不然台账里那些「为什么没过」会换一套说法。
      failure = "tsrun: 还没实现的构造或语言层错误：" + RunErrorText(error);
      status = 1;
    }
    if (status === 0 && result.Outcome !== HostOutcome.Ok) {
      if (result.Outcome === HostOutcome.ScriptThrew && result.Table !== null) {
        failure = "tsrun: 脚本抛出：" + RunDescribe(result.Table, result.Error);
      } else {
        failure = "tsrun: " + result.Message;
      }
      status = 1;
    }
  }
  const record = {
    id: id,
    status: status,
    stdout: lines.length === 0 ? "" : lines.join("\n") + "\n",
    stderr: failure === "" ? "" : failure + "\n",
  };
  RunWrite(JSON.stringify(record) + "\n");
}
```

# class RunNode

**运行环境：把入口要用到的 Node 内建模块收在一处。**

**为什么走 `process.getBuiltinModule` 而不是顶层 `import`**：与 `cjcli.xl.md` 的
`CjcliHost` 同一条理由——顶层 `import` 会被提到产物开头、插到 xl 的产物头前面，
产物头就不再是前三行；`getBuiltinModule` 是**运行期调用**，不会被提升，
也不需要 `@types/node` 之外的任何声明。

## static method Fs:()=>any

文件系统模块（真正的类型由下面这行 `as` 给出）。

```ts
return process.getBuiltinModule("node:fs") as typeof import("node:fs");
```

## static method Path:()=>any

路径模块。

```ts
return process.getBuiltinModule("node:path") as typeof import("node:path");
```

# statement

**启动：把命令行参数交给 `RunMain`——但只在这个文件被「直接执行」时。**

**为什么要有那道判断**：本文件**同时是库**（`tests/runtime/check.mjs` 与客户宿主
`import` 它的 `RunSources` / `RunRequest`）——不加判断的话，**谁 import 它谁就等于
在命令行上跑了一次 tsrun**：`process.argv` 是**别人的**参数（判据进程的参数），
`process.exitCode` 会被置成 1，判据于是莫名其妙地红。
`require.main === module` 是 CommonJS 里「我被直接执行」的判据，而产物就是 CommonJS
（`tsconfig.json` 的 `module: commonjs`）。

**shebang 不在这里**（xl 的产物头永远占前三行），它落在 `bin/tsrun.js` 上——
与 `cjcli` 同一条约定。

```ts
if (require.main === module) {
  RunMain(process.argv.slice(2));
}
```
