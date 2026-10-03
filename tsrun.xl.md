# dependencies
```xl
import { Template } from "./core/syntax/templates/template.xl.md"
import { TextDocument } from "./typescript/text-document.xl.md"
import { TextContext } from "./typescript/text-context.xl.md"
import { projectRoot, ToJsonText } from "./typescript/print-ast-common.xl.md"
import { Lowering, LoweredModule, CapabilityLookup } from "./typescript-exec/lowering.xl.md"
import { Bindings, LookupOf } from "./typescript-exec/bindings.xl.md"
import { GlobalNames, BuildGlobals, LogSink } from "./typescript-exec/builtins/globals.xl.md"
import { InstallBuiltins, InvokeWithSink } from "./typescript-exec/builtins/install.xl.md"
import { NeverCall } from "./typescript-exec/builtins/array.xl.md"
import { Value, ValueTag } from "./runtime/value.xl.md"
import { HeapTable } from "./runtime/heap.xl.md"
import { RoomChecker } from "./runtime/rt.xl.md"
import { SetProperty } from "./runtime/props.xl.md"
import { IdTable, Encode } from "./runtime/ir-verify.xl.md"
import { RtOpCount } from "./runtime/ir.xl.md"
import { Vm, VmStatus } from "./runtime/vm.xl.md"
import { Host, HostOutcome, Limits } from "./runtime/host-abi.xl.md"
import { LinkPrograms } from "./runtime/link.xl.md"
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

# type RunHost = (room:RoomChecker, id:number, self:Value, args:Array<Value>)=>Value | null

**宿主对能力调用的回答**：认这个号就给一个值，不认就给 `null`（落到标准库去）。

`room` 先给出来是**规矩**：宿主函数要分配就得先问预算（`host-abi.xl.md` 的调用通道）。

# type PrepareArgs = (table:HeapTable, machine:Vm)=>Array<Value>

**在入口开帧之前，由宿主造出入口的实参。**

**为什么要有它**：有些实参只能在「装起来之后」造——最典型的是 **async 入口要的那个承诺**
（承诺住在堆里，而堆是运行器建的）。宿主在这里拿到表与机器，就能自己造。
**这也把「谁是事件循环」这件事说清楚了：宿主才是。**

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
const ids = new IdTable(RtOpCount, request.Capabilities.length + 1);
const modules: LoweredModule[] = [];
for (let i = 0; i < request.Sources.length; i++) {
  const lowering = new Lowering();
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
const machine = new Vm(table, 1 << 20, 1000000);
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
const first = host.Evaluate([BuildGlobals(machine, protos, sink)]);
if (first.Outcome !== HostOutcome.Ok) {
  result.Outcome = first.Outcome;
  result.Message = "第 0 份模块求值：" + first.Message;
  return result;
}
InstallBuiltins(machine, protos);
host.InstallHost((target, self, args, room) => {
  const id = table.Get(target.Ref).AsHost().CapabilityId;
  const answered = answer(room, id, self, args);
  if (answered !== null) return answered;
  return InvokeWithSink(room, table, protos, id, self, args, sink);
});
for (let i = 0; i < request.Capabilities.length; i++) {
  const id = 64 + i;
  host.Register(id, Value.FromRef(ValueTag.HostRef, table.CreateHostRef(id, 0)));
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
  if (machine.Status !== VmStatus.Halted) {
    result.Outcome = HostOutcome.OutOfSteps;
    result.Message = "第 " + i + " 份模块没跑完";
    return result;
  }
  exports = machine.Result;
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
