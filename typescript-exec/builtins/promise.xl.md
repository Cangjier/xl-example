# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, PropertyCharge, PromiseState } from "../../runtime/heap.xl.md"
import { RoomChecker, IsCallableValue, RtToBoolean } from "../../runtime/rt.xl.md"
import { Protos, SetProperty, SetHiddenProperty, GetProperty, NewPlainObject, NewPlainArray, NeverRoom } from "../../runtime/props.xl.md"
import { Vm, TaskScheduler, TaskSettler, InvokeCallback, ThrownTaker } from "../../runtime/vm.xl.md"
import { Units, NeverCall } from "./array.xl.md"
import { NameValue } from "./map.xl.md"
```

# namespace cangjie

**`Promise`**（第 185 轮）。

引擎那一侧**早就有承诺**：`HeapPromise`（状态 + 兑现值 + 等着它的那些帧）、
微任务队列、`await` 的挂起与恢复。缺的从来是**语言层那一格**：
`Promise` 不是全局名、承诺上没有 `.then`。

**这一层要补两件事**：

1. **`Promise` 这个名字**（`resolve` / `reject` / `all` / `race`）——挂在一个
   **既是对象又能被 `new`** 的值上（与 `Date` 同一个形状：`AttachCallable`）；
2. **承诺上的 `then` / `catch` / `finally`**——**逐个实例挂**
   （与 `Map` / `Set` 同一条路：那两族的原型**不挂方法**，方法挂在实例上）。
   原型那一格只做两件事（第 601 轮）：`instanceof Promise` 与 `[object Promise]`。

**推迟那一半由引擎做**（不是这一层）：`.then(f)` 的 `f` 必须在**微任务**里跑
（`Promise.resolve(1).then(f); console.log("x")` 在 Node 里先印 `x`）。
建库层拿到的 `call` 是**同步重入**，做不出「推迟」——所以这一层只说
「**源承诺、回调、实参、结果承诺、认哪一档**」五样，
由执行器（`vm.xl.md` 的 `ScheduleTask`）去排、去调。

**写在明处的一条缺口**：`Promise.then(f, g)` 两个实参的形式（一步只有一个回调）。

# const PromiseCtor:int = 230

**`Promise` 这个值本身的号**（也是 `new Promise(执行器)` 的号）。

# const PromiseResolve:int = 231

**`Promise.resolve(值)`**——已兑现的承诺。

# const PromiseReject:int = 232

**`Promise.reject(原因)`**——已拒绝的承诺。

# const PromiseAll:int = 233

**`Promise.all(数组)`**。

# const PromiseRace:int = 234

**`Promise.race(数组)`**。

# const PromiseAllSettled:int = 242

**`Promise.allSettled(数组)`**（第 295 轮）——号**追加在表尾**（`230..241` 已经占了）。

**它与 `all` 只差一条**：**永远兑现**（每一项都变成 `{status, value}` / `{status, reason}`，
`all` 则是「有一个被拒绝就整个拒绝」）——所以它要**两档都收**
（`all` 只认兑现那一档，见下面那一支的 `wants`）。

# const PromiseAny:int = 243

**`Promise.any(数组)`**（第 295 轮）——号**追加在表尾**。

**它与 `race` 只差一条**：**只认兑现**（第一个兑现的定胜负）；
**全部被拒绝**时抛一个 **`AggregateError`**（里面按输入顺序装着每一个拒绝原因）。

# const PromiseQueueMicrotask:int = 255

**`queueMicrotask(回调)`**（第 332 轮，ES2020）——**一个全局函数**，
可它的号落在**承诺这一段的尾巴上**。

**为什么号在这里**：它要的东西与 `.then` **一模一样**——「把一次调用排进微任务队列」，
而那条通道（`schedule`）只有这一段的 `InvokePromise` 手上有。
**名字与号不是一个东西**：号只是**路由的键**（`install.xl.md` 那张窄段表），
挂在哪儿是 `BuildGlobals` 的事——它是全局名、不是 `Promise` 的静态方法。
**不许为了「好看」把它挪到全局段的尾巴**：那样 `schedule` 拿不到，
而症状是「排不进队列」——离现场很远。

**它落成什么**：`schedule(undefined, 回调, [], 一个没人看的承诺, 0, false, undefined)`。

**号取 `255`、而且走一条单号路由**（第 332 轮）——**这一格踩过一次号撞车**：
第一版取的是 `250`，而 **`250` 是 `SymbolCtor`**（`globals.xl.md` 的 `Symbol` 那一族
占着 `250..254`）⇒ `install.xl.md` 那条窄段（`id >= 230 && id < 250`）一挪上界，
**`Symbol` 那五个号就被这一段截走** ⇒ `Symbol("x")` 给 `undefined`。
**21 条判据当场红**，而报的话分布在三种（`typeof` 给 `undefined` /
`Symbol.keyFor needs a symbol` / `invalid handle: 0`）——**一句都没提号**。
**号撞车是静默的**（第 150 轮 `ArrayAt` / 第 280 轮 `Date` 各踩过一次）。
**修法两条一起**：挪到一个空号（`255`——`254` 之后第一格）**并且**在
`install.xl.md` 里给一条单号路由（上界那一招这次不能用：255 与 230..249 不连续）。

**源给 `undefined` 是关键**（不是「一个已兑现的承诺」）：引擎那一支对
「源根本不是承诺」的处理是**直接排队、不接任何值** ⇒ 回调收到**零个实参**
（JS 就是这么调的）。给一个**已兑现的承诺**会让引擎把兑现值**接在实参后面**
⇒ 回调里 `arguments.length` 变成 1（**静默错值**，而两处看起来都能跑）。

**次序天然就是对的**：`queueMicrotask(a); Promise.resolve().then(b)` 两条都排进
**同一条队列**、按挂上的先后走（判据 `c305-std-queue-microtask-order` 量的正是它）。

# const PromiseSettledStepId:int = 244

**`allSettled` 的「兑现」那一步**（第 295 轮）。

# const PromiseRejectedStepId:int = 245

**`allSettled` 的「拒绝」那一步**（第 295 轮）。

# const PromiseAnyStepId:int = 246

**`any` 的「兑现」那一步**（第 295 轮）。

# const PromiseAnyRejectStepId:int = 247

**`any` 的「拒绝」那一步**（第 295 轮）。

**为什么两步要**两个号**：引擎**只把结清值接在实参后面**（`Args.push(settled)`），
**不告诉回调「这是哪一档」**——所以「兑现」与「拒绝」只能各走一个号
（`.then(f, g)` 那一格早就用了同一招：`wants === 3` 时按 `reject` 在
`callback` 与 `onRejected` 之间挑，见 `vm.xl.md` 的 `RunNativeTask`）。
**这是引擎那一格的形状决定的**，不是随手多开两个号。

# const PromiseThen:int = 235

**`承诺.then(回调)`**。

# const PromiseCatch:int = 236

**`承诺.catch(回调)`**——就是「只认拒绝那一档」的 `then`。

# const PromiseFinally:int = 237

**`承诺.finally(回调)`**（第 187 轮）：两档都调、回调的返回值不算数
（`wants = 4`，引擎那一支管着），源那一档原样传下去——见下面 `PromiseFinally` 那一支。
**已知与 Node 的时序差**：回调**抛**时，Node 在**同一 tick** 里就把派生承诺拒绝掉
（它的 `finally` 就是 `then` 拼出来的，那一抛落在 `then` 的回调里）⇒ 少一跳；
本仓两条都走同一个任务 ⇒ 派生承诺晚一跳被拒绝 ⇒ `.catch` 的**行序**与 Node 不同
（判据 `c371-stdlib-promise-finally-passthrough` 量的就是它）。

# const PromiseAllStepId:int = 238

**`Promise.all` 的每一步**——引擎结清一个输入时调它一次。

# const PromiseRaceStepId:int = 239

**`Promise.race` 的第一步**。

# const PromiseResolveCallbackId:int = 240

**执行器拿到的那个 `resolve`**（第 285 轮）——`new Promise((resolve) => resolve(5))`。

**它不是静态方法**：与 `PromiseAllStepId` / `PromiseRaceStepId` 那两步同一条形状
（语言层自己造的宿主回调，由 `InvokePromise` 分派回来）。
**漏了这一支的症状**是 `unimplemented: promise builtin id 240`
——那句话听起来像「有个静态方法没实现」，其实是「执行器递出去的那个函数没人接」。

# const PromiseRejectCallbackId:int = 241

**执行器拿到的那个 `reject`**（第 285 轮）——`new Promise((_r, reject) => reject("no"))`。

# const PromiseWithResolvers:int = 248

**`Promise.withResolvers()`**（第 327 轮）——号**追加在承诺段尾**
（`230..247` 已经满了，所以号段的**上界也跟着挪一格**：`install.xl.md` 那一句
`id >= 230 && id < 248` 改成 `< 249`——**上界与「这一段有多少个号」是同一件事**，
少挪一格就是 `unimplemented: global builtin 248`，第 295 轮踩过一模一样的）。

**它是「三样东西一起交出去」**：一个**待结清**的承诺 + `resolve` + `reject`，
装在一个普通对象上（`{ promise, resolve, reject }`）。
**一件新东西都没有**：承诺走 `MakePromise`（三个方法照挂）、
两个回调走 `MakeSettleCallback`（第 285 轮那一对）——这一格只是**把它们装到一起**。

# const PromiseTry:int = 249

**`Promise.try(回调, …实参)`**（第 331 轮，ES2025）——号**照旧追加在承诺段尾**。

**上界要跟着挪第三次**（`install.xl.md` 那一句 `< 249` → `< 250`）：
**295 / 327 / 331 三个轮次踩的是同一处**——上界与「这一段有多少个号」是**同一件事**，
而症状每次都长得像「有一个全局号没实现」。**这一条账写在这一处，就是为了下次别再踩**。

**它不是 `Promise.resolve(回调())`**，也不是 `new Promise(r => r(f()))`——
两条候选各自的错处写在 `InvokePromise` 那一支的说明里。**一件新东西都没有**：
承诺、调用通道、取走那一抛、结清，四样都是现成的。

# const PromiseThenableAdopt:int = 257

**「这个值是可采纳对象（thenable）吗」**（第 359 轮）——引擎在**兑现**一个承诺之前
回调进来问一句（`vm.xl.md` 的 `ResolvePromise`）。

**号为什么落在 257（家族外面）**（**实测撞过一次**）：这一族是 **230..249**，
而**二十格一个不剩**——第一版随手写了 **249**，正好是 **`PromiseTry`**
⇒ `Promise.try` 被分派到**这一格** ⇒ 它返回一个**布尔假** ⇒ 调用方拿到的
「承诺」其实是 `false` ⇒ 下一步 `p.then(...)` 报 **`cannot call a non-closure value`**
（**一句话里没有一个字提到 `Promise.try`**，而它把 `c330-std-promise-try-value`、
`…-throw`、`c331-std-promise-try-forms`、`c331-e2e-promise-reject-paths`
**四格一起打红**）。
**这一族里挑号必须先把 230..249 数一遍**——而**静态检查那一门当时没拦住**
（它认的是**指令表**那一张，语言层新加的常量**不在里面**），
所以第 359 轮把这条**补进了 `runtime:check`**（`typescript-exec/builtins/` 里的
`# const …:int = N` **必须两两不同**）——**下一次撞号会在门前就红**。

**为什么要有它**：JS 的解决过程**不止认承诺**——`{ then(res) { res(42); } }` 也一样
被采纳（Node 给 `v 42`、本仓原来给 `v { then: [Function: then] }`，
判据 `c305-std-thenable-adoption` 量的就是它）。而那一格 `then` 要**读属性、还要调它**
——**引擎不认识那个名字**，所以判据在这一层（与 `Symbol.hasInstance` 同一条分界）。

**返回真 =「我认领了」**（引擎于是不再把值原样灌进去）；返回假 =「不是 thenable」
（引擎照旧按普通值兑现）。

**两个回调借的是现成的**：`MakeSettleCallback` 造的就是执行器手里那两格
（第 285 轮、与 `new Promise(...)` 里那个 `resolve` **一字不差**），
所以「采纳」这条路**不需要任何新的回调机关**。

**`then` 抛了怎么办**：按 JS 的解决过程，那要把**外层承诺拒绝掉**
（`takeThrown` 就是那一格）——**不接住**的话异常会冒到调用者，
而调用者是**引擎**（症状是「整段微任务处理被打断」，离现场很远）。

# const PromiseArrayFromStepId:int = 259

**`Array.fromAsync` 的「迭代器那一步」**（第 369 轮）。

**状态从实参来**（不是从不透明值）：与 `PromiseAllStepId` 那一格**同一个手法**——
`schedule(承诺, 回调, [state], 结果承诺, wants, …)`，引擎把**结清值接在实参后面**
（`vm.xl.md` 的 `TaskScheduler`）。**这是第 368 轮留下的那个未知点**，
问的正是「`Promise.all` 是怎么把状态塞进回调实参的」——答案是**第三格那个实参表**。

# const PromiseArrayFromMapStepId:int = 261

**`Array.fromAsync` 的「映射函数那一步」**（第 369 轮）。

**为什么两步要两个号**：与 `allSettled` 那两步**同一条理由**——引擎**只把结清值接在实参后面**、
**不告诉回调「这是哪一次等待的结果」** ⇒ 「等迭代器」与「等映射函数」只能各走一个号。

# method ArrayFromAsyncValues:(room:RoomChecker, table:HeapTable, protos:Protos, args:Array<Value>, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>Value

**`Array.fromAsync(可迭代物, 映射函数?)`**（第 369 轮）。

**它缺的是什么**：`Array.from` 那条路是**同步**的（读一项、放一项），而这一条**每一项都可能是
一个承诺** ⇒ 「读一项 → 等它 → 再读下一项」这条链**只能靠承诺回调接起来**
（建库层没有「回来接着跑」这种东西）。

**零件全是现成的**（第 368 轮量过）：状态机照 `Promise.all`（堆上的状态对象 +
`SetNumberProp` / `ReadProp` + `schedule` 的实参表 + `settle` 结清）、
「等一等」用引擎现成的调度器——**一个新机关都没有**。

**为什么不用 `invoke(then)`**：`.then` 那条路**只接结清值**、**没有地方塞状态**；
而 `schedule` 的第三个实参**就是为这件事存在的**（`Promise.all` 那一格写着）。

```ts
if (invoke === null || schedule === null || settle === null) {
  throw new Error("unimplemented: Array.fromAsync needs the settle channel (the host did not provide it)");
}
const source = args.length > 0 ? args[0] : Value.Undefined();
const mapper = args.length > 1 ? args[1] : Value.Undefined();
const out = NewPlainArray(room, table, protos);
const result = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
const state = NewPlainObject(room, table, protos);
SetNumberProp(room, table, state, "out", out);
SetNumberProp(room, table, state, "result", result);
SetNumberProp(room, table, state, "mapper", mapper);
SetNumberProp(room, table, state, "index", Value.FromInt(0));
// **迭代器怎么拿**：先认异步那一格（`Symbol.asyncIterator`，第 320 轮挂上），
// 没有就退回同步的（`Symbol.iterator`）。**两个键都从 `Symbol` 对象上取**，
// 不在这一层写死号。
const asyncKey = WellKnownSymbolValue(room, invoke, protos, table, "asyncIterator");
const syncKey = WellKnownSymbolValue(room, invoke, protos, table, "iterator");
let iteratorMethod = asyncKey.Tag === ValueTag.Symbol
  ? GetProperty(room, invoke, protos, table, source, asyncKey) : Value.Undefined();
if (!IsCallableValue(table, iteratorMethod) && syncKey.Tag === ValueTag.Symbol) {
  iteratorMethod = GetProperty(room, invoke, protos, table, source, syncKey);
}
if (!IsCallableValue(table, iteratorMethod)) {
  // **没有迭代器这一档**（JS 里 `Array.fromAsync({ length: 3 })` 也走下标）——
  // 与 `Array.from` 的数组式那一支同一条路（`install.xl.md` 的 `ArrayFromValues`），
  // **今天不做**：先让「有迭代器」这两类（同步 / 异步）对起来。
  settle(result, out, false);
  return result;
}
const iterator = invoke(iteratorMethod, source, []);
SetNumberProp(room, table, state, "iterator", iterator);
const nextMethod = GetProperty(room, invoke, protos, table, iterator, NameValue(table, "next"));
SetNumberProp(room, table, state, "next", nextMethod);
ArrayFromAsyncPump(room, table, protos, state.Ref, invoke, schedule, settle, takeThrown);
return result;
```

# method WellKnownSymbolValue:(room:RoomChecker, invoke:InvokeCallback | null, protos:Protos, table:HeapTable, name:string)=>Value

**从全局 `Symbol` 上取一个众所周知符号**（`asyncIterator` / `iterator`）。

**为什么不在这一层写死**：符号值住在堆里（`SymbolFor` 那张表），
在这一层写一个号就是第 359 轮那次撞号的同类。
**表挂在原型表上**（`protos.WellKnownSymbols`，`globals.xl.md` 建它的时候写的）
⇒ **任何建库层文件都够得着**，不必绕全局对象（第一版写了个 `GetGlobalObject()`，那东西不存在）。

```ts
if (invoke === null) return Value.Undefined();
const wellKnown = protos.WellKnownSymbols > 0
  ? Value.FromRef(ValueTag.Object, protos.WellKnownSymbols) : Value.Undefined();
if (!wellKnown.IsObject()) return Value.Undefined();
return GetProperty(room, invoke, protos, table, wellKnown,
  Value.FromString(table.CreateString(Units(name))));
```

# method ArrayFromAsyncPump:(room:RoomChecker, table:HeapTable, protos:Protos, stateRef:int, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>void

**走一步**：读下一项，再让**调度器**在它结清之后接着走。

**判据是「它是不是承诺」**（不是「像不像」）：异步迭代器的 `next()` 给承诺，
同步的给 `{ value, done }`——`Promise.all` 对**普通项**的处理是「包一个已兑现的承诺」
（第 247 轮），这里照抄。

```ts
if (invoke === null || schedule === null || settle === null) return;
const state = Value.FromRef(ValueTag.Object, stateRef);
const iterator = ReadProp(room, table, protos, state, "iterator");
const nextMethod = ReadProp(room, table, protos, state, "next");
const raw = invoke(nextMethod, iterator, []);
const thrown = takeThrown === null ? Value.Undefined() : takeThrown();
if (thrown.Tag !== ValueTag.Undefined) {
  settle(ReadProp(room, table, protos, state, "result"), thrown, true);
  return;
}
const one = IsPromise(table, raw) ? raw : MakePromise(room, table, protos, PromiseState.Fulfilled, raw);
const stepValue = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseArrayFromStepId, 0));
const result = ReadProp(room, table, protos, state, "result");
schedule(one, stepValue, [state], result, 0, false, Value.Undefined());
```

# method ArrayFromAsyncReceive:(room:RoomChecker, table:HeapTable, protos:Protos, record:Value, state:Value, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>void

**拿到了一条迭代器结果**（`{ value, done }`）：完事就结清，否则过一遍映射函数、
推一项、再走一步。

**映射函数那一格的两条路**：它可能**同步**给一个值（`(v) => v * 2`）、
也可能给一个承诺（`(v) => Promise.resolve(v * 2)`，判据里那一条）——
**同一条「是不是承诺」的判据**（与上面 `Pump` 一字不差）。

```ts
if (invoke === null || schedule === null || settle === null) return;
const result = ReadProp(room, table, protos, state, "result");
const doneValue = ReadProp(room, table, protos, record, "done");
if (doneValue.Tag === ValueTag.Bool && doneValue.AsBool()) {
  settle(result, ReadProp(room, table, protos, state, "out"), false);
  return;
}
const item = ReadProp(room, table, protos, record, "value");
const mapper = ReadProp(room, table, protos, state, "mapper");
if (IsCallableValue(table, mapper)) {
  const index = ReadProp(room, table, protos, state, "index");
  const mapArgs: Value[] = [item, index];
  const mapped = invoke(mapper, Value.Undefined(), mapArgs);
  const thrownMap = takeThrown === null ? Value.Undefined() : takeThrown();
  if (thrownMap.Tag !== ValueTag.Undefined) {
    settle(result, thrownMap, true);
    return;
  }
  const oneMapped = IsPromise(table, mapped) ? mapped : MakePromise(room, table, protos, PromiseState.Fulfilled, mapped);
  const mapStep = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseArrayFromMapStepId, 0));
  schedule(oneMapped, mapStep, [state], result, 0, false, Value.Undefined());
  return;
}
ArrayFromAsyncPush(room, table, protos, item, state);
ArrayFromAsyncPump(room, table, protos, state.Ref, invoke, schedule, settle, takeThrown);
```

# method ArrayFromAsyncPush:(room:RoomChecker, table:HeapTable, protos:Protos, value:Value, state:Value)=>void

**推一项进结果数组**（顺带把下标加一）。

```ts
if (!room(ValueCharge)) throw new Error("out of room");
const out = ReadProp(room, table, protos, state, "out");
table.Get(out.Ref).AsArray().Push(value);
const index = ReadProp(room, table, protos, state, "index");
SetNumberProp(room, table, state, "index", Value.FromInt(index.AsInt() + 1));
```

# method PromiseArrayFromStep:(room:RoomChecker, table:HeapTable, protos:Protos, args:Array<Value>, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>Value

**「等迭代器」那一步**（号 `PromiseArrayFromStepId`）——`args[0]` 是状态、`args[1]` 是结清值。

```ts
const state = args.length > 0 ? args[0] : Value.Undefined();
const record = args.length > 1 ? args[1] : Value.Undefined();
if (!state.IsObject()) return Value.Undefined();
ArrayFromAsyncReceive(room, table, protos, record, state, invoke, schedule, settle, takeThrown);
return Value.Undefined();
```

# method PromiseArrayFromMapStep:(room:RoomChecker, table:HeapTable, protos:Protos, args:Array<Value>, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>Value

**「等映射函数」那一步**（号 `PromiseArrayFromMapStepId`）——`args[1]` 是**映射之后**的值。

```ts
const state = args.length > 0 ? args[0] : Value.Undefined();
const mapped = args.length > 1 ? args[1] : Value.Undefined();
if (!state.IsObject()) return Value.Undefined();
ArrayFromAsyncPush(room, table, protos, mapped, state);
ArrayFromAsyncPump(room, table, protos, state.Ref, invoke, schedule, settle, takeThrown);
return Value.Undefined();
```

# const AsyncIterableStepId:int = 262

**`for await` 走自定义异步迭代器时的「等一步」**（第 643 轮）。

**与 `PromiseArrayFromStepId` 同一形状**：状态走 `schedule` 的实参表、结清值接在
实参后面。**号也在家族外面**——230..249 一个不剩（与那两步同一条账），
这里是 261 之后第一格。

**为什么不是新的一套机器**：`iter_next` 走的是**同步**通路（引擎把异步生成器
自己排空微任务），而用户自己写的 `[Symbol.asyncIterator]` 给的是一**承诺**——
「等它 → 再走一步」这条链只有承诺回调接得起来，而这条链 `Array.fromAsync` 已经有一条。

# method AsyncIterableValues:(room:RoomChecker, table:HeapTable, protos:Protos, value:Value, method:Value, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>Value

**把一个自定义异步可迭代物收成一个数组**（第 643 轮）——返回的是**承诺**。

**为什么收成数组**：引擎的 `iter_new` 只认数组 / 生成器 / 字符串，
而语言层**造不出生成器**（那是引擎从 IR 起的）⇒ 与自定义**同步**迭代器
（`install.xl.md` 的 `GetIterator`）同一条路：先摊平、再交给引擎。

**收尾那一格 `__close` 也照抄那一条**：数组上挂一个绑好的 `return`，
`break` / `return` 出循环时降级层问的就是它（判据 `c639-e2e-async-iterator-for-await`）。

```ts
if (invoke === null || schedule === null || settle === null) {
  throw new Error("unimplemented: an async iterable needs the settle channel (the host did not provide it)");
}
const out = NewPlainArray(room, table, protos);
const result = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
const iterator = invoke(method, value, []);
if (!iterator.IsObject()) {
  throw new Error("unimplemented: Symbol.asyncIterator did not return an object");
}
const state = NewPlainObject(room, table, protos);
SetNumberProp(room, table, state, "out", out);
SetNumberProp(room, table, state, "result", result);
SetNumberProp(room, table, state, "iterator", iterator);
const nextMethod = GetProperty(room, invoke, protos, table, iterator, NameValue(table, "next"));
SetNumberProp(room, table, state, "next", nextMethod);
// **`return` 先绑好**：它要在「读到 done」那一刻才写进数组，
// 而那时脚本已经跑过好几轮了 ⇒ 现在取、现在绑、存在状态里（与 `IteratorMethodOf` 那一段同理）。
const closeMethod = GetProperty(room, invoke, protos, table, iterator,
  Value.FromString(table.CreateString(Units("return"))));
if (IsCallableValue(table, closeMethod)) {
  const bindFn = GetProperty(room, invoke, protos, table, Value.FromObject(protos.Function),
    Value.FromString(table.CreateString(Units("bind"))));
  if (IsCallableValue(table, bindFn)) {
    SetNumberProp(room, table, state, "close", invoke(bindFn, closeMethod, [iterator]));
  }
}
AsyncIterablePump(room, table, protos, state.Ref, invoke, schedule, settle, takeThrown);
return result;
```

# method AsyncIterablePump:(room:RoomChecker, table:HeapTable, protos:Protos, stateRef:int, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>void

**走一步**：调一次 `next()`，让调度器在它结清之后接着走。

**判据是「它是不是承诺」**（与 `ArrayFromAsyncPump` 一字不差）：
异步迭代器的 `next()` 给承诺，也给得出普通对象（`[Symbol.asyncIterator]` 里
返回 `{ value, done }` 的写法一样合法）。

```ts
if (invoke === null || schedule === null || settle === null) return;
const state = Value.FromRef(ValueTag.Object, stateRef);
const iterator = ReadProp(room, table, protos, state, "iterator");
const nextMethod = ReadProp(room, table, protos, state, "next");
const raw = invoke(nextMethod, iterator, []);
const thrown = takeThrown === null ? Value.Undefined() : takeThrown();
if (thrown.Tag !== ValueTag.Undefined) {
  settle(ReadProp(room, table, protos, state, "result"), thrown, true);
  return;
}
const one = IsPromise(table, raw) ? raw : MakePromise(room, table, protos, PromiseState.Fulfilled, raw);
const stepValue = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(AsyncIterableStepId, 0));
schedule(one, stepValue, [state], ReadProp(room, table, protos, state, "result"), 0, false, Value.Undefined());
```

# method AsyncIterableStep:(room:RoomChecker, table:HeapTable, protos:Protos, args:Array<Value>, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>Value

**「等一步」那一步**（号 `AsyncIterableStepId`）——`args[0]` 是状态、`args[1]` 是结清值。

```ts
const state = args.length > 0 ? args[0] : Value.Undefined();
const record = args.length > 1 ? args[1] : Value.Undefined();
if (!state.IsObject()) return Value.Undefined();
AsyncIterableReceive(room, table, protos, record, state, invoke, schedule, settle, takeThrown);
return Value.Undefined();
```

# method AsyncIterableReceive:(room:RoomChecker, table:HeapTable, protos:Protos, record:Value, state:Value, invoke:InvokeCallback | null, schedule:TaskScheduler | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>void

**拿到了一步的结果**：完事就绑上 `__close` 再结清，否则推一项、再走一步。

**`next()` 兑现成不是对象的东西要响亮地抛**（JS 是 `TypeError`）：
静默当作 `done` 会把「一个坏迭代器」读成「一个空可迭代物」——
那种错值没有任何一处看得见。抛在回调里 ⇒ **结果承诺被拒**，
于是 `await` 它的那个异步函数收到这一抛（与 JS 的位置一致）。

```ts
if (invoke === null || schedule === null || settle === null) return;
if (!record.IsObject()) {
  throw new Error("unimplemented: an async iterator's next() must fulfil with an object");
}
const result = ReadProp(room, table, protos, state, "result");
const done = RtToBoolean(table, ReadProp(room, table, protos, record, "done")).AsBool();
const out = ReadProp(room, table, protos, state, "out");
if (done) {
  const close = ReadProp(room, table, protos, state, "close");
  if (IsCallableValue(table, close)) {
    SetHiddenProperty(room, table, out, Value.FromString(table.CreateString(Units("__close"))), close);
  }
  settle(result, out, false);
  return;
}
const item = ReadProp(room, table, protos, record, "value");
if (!room(ValueCharge)) throw new Error("out of room");
table.Get(out.Ref).AsArray().Push(item);
AsyncIterablePump(room, table, protos, state.Ref, invoke, schedule, settle, takeThrown);
```

# method ThenMethodOf:(room:RoomChecker, table:HeapTable, protos:Protos, candidate:Value, call:InvokeCallback | null)=>Value

**可采纳对象的那一格 `then`**——不是就给 `undefined`。

**只认四种值**（对象 / 数组 / 闭包 / 内建函数）：原始值不可能有 `then`（去问它是白跑一趟）。

**为什么单独一个方法**（第 601 轮）：两处要问同一句话——
① 引擎结清一个承诺之前问的那一句（`PromiseThenableStep`：问到就地采纳）；
② `Promise.resolve(值)`（问到就把采纳**排进一个微任务**，见 `PromiseResolve` 那一支）。
**两处各写一遍判据迟早会漂**，而漂的症状是「`Promise.resolve(x)` 采纳了、`resolve(x)` 没有」
——正是最难查的那一种。

```ts
if (call === null) return Value.Undefined();
if (candidate.Tag !== ValueTag.Object && candidate.Tag !== ValueTag.Array
  && candidate.Tag !== ValueTag.Closure && candidate.Tag !== ValueTag.Function) {
  return Value.Undefined();
}
const thenMethod = GetProperty(room, call, protos, table, candidate, NameValue(table, "then"));
if (!IsCallableValue(table, thenMethod)) return Value.Undefined();
return thenMethod;
```

# method PromiseThenableStep:(room:RoomChecker, table:HeapTable, protos:Protos, args:Array<Value>, invoke:InvokeCallback | null, settle:TaskSettler | null, takeThrown:ThrownTaker | null)=>Value

**判据与调用**（第 359 轮）——与上面那个号一对。

**判据借的是 `ThenMethodOf`**（第 601 轮）：同一句话只写一处。
**它也是「采纳」那一步**：`then` 一调，结清与拒绝就都落到这个承诺上。

```ts
if (invoke === null) return Value.FromBool(false);
const promise = args.length > 0 ? args[0] : Value.Undefined();
const candidate = args.length > 1 ? args[1] : Value.Undefined();
const thenMethod = ThenMethodOf(room, table, protos, candidate, invoke);
if (thenMethod.Tag === ValueTag.Undefined) return Value.FromBool(false);
const onOk = MakeSettleCallback(table, promise, false);
const onErr = MakeSettleCallback(table, promise, true);
const thenArgs: Value[] = [onOk, onErr];
invoke(thenMethod, candidate, thenArgs);
const thrown = takeThrown === null ? Value.Undefined() : takeThrown();
if (thrown.Tag !== ValueTag.Undefined && settle !== null) {
  settle(promise, thrown, true);
}
return Value.FromBool(true);
```

# method MakeSettleCallback:(table:HeapTable, promise:Value, rejected:bool)=>Value

**造一个「结清这个承诺」的宿主回调**（第 285 轮）——执行器的两个形参就是它。

**两个号、一份实现**：`resolve` 与 `reject` 只差**认哪一档**，
所以它们落在号段里相邻的两个号上（240 = 兑现、241 = 拒绝）、
由 `InvokePromise` 分成两支——**写成两份实现就是两处会漂**
（而漂的症状正是「`reject` 之后 `resolve` 又生效」，那是 JS 里**明令**不许的：
承诺结清一次就定死了）。

**「哪一个承诺」藏在宿主引用的 `Opaque` 那一格里**：宿主引用值自己带着一个整数
（`CreateHostRef(号, 不透明值)`）——于是**不必**给这一族再开一张表，
与 `bind` 造出来的那个通知对象同一个手法（`globals.xl.md` 的 `BoundCall`）。

**`Opaque` 收的是句柄、不是值**：`Value` 是「标签 + 下标」两格，
而 `Opaque` 只有一格——收句柄、用的时候现包一个值（见 `SettleOfCallback`）。

**它还差一步（第 286 轮量清、下一轮做）**：脚本里 `resolve` 是**当普通函数**调的
（`(resolve) => resolve(1)`，**没有接收者**），而这一族读的是
**接收者**那一格（`InvokePromise` 的 `self`）——于是 `self` 是 `undefined`，
宿主读 `self.Tag` 报 `Cannot read properties of undefined (reading 'Tag')`，
那一抛被抬成脚本异常 ⇒ 这个新承诺被**拒绝** ⇒
宿主说「脚本挂着等一个它没结清的承诺」（**看起来像运行器卡住**）。
**两条候选**（都试过、都差最后一步）：① 引擎那条 `InvokeCallback` 多收一格
**接收者**（`invoke(executor, self, args)`，本轮加了）——可 `resolve` 是**脚本自己**
调的，`self` 由**那条调用**决定，给执行器一个接收者**传不到它身上**；
② 让 `MakeSettleCallback` 造一个**绑定过的**值（把承诺写进实参表第一格，
宿主分派那一支读 `args[0]`）——这条路要用 `bind` 那条already有的机关，
是下一轮最短的一步。

```ts
return Value.FromRef(ValueTag.HostRef, table.CreateHostRef(
  rejected ? PromiseRejectCallbackId : PromiseResolveCallbackId, promise.Ref));
```

# method SettleOfCallback:(table:HeapTable, self:Value)=>Value

**从一个结清回调里读回它管的那个承诺**（第 285 轮）。

**读不到就响亮地抛**（不静默给 `undefined`）：能走到这一支的
只可能是「语言层自己造的回调」——读不到就是**建库层或引擎的 bug**，
不是脚本写错了（与 `get_index` 那条「形状不对就抛」同一条纪律）。

```ts
if (self.Tag !== ValueTag.HostRef) {
  throw new Error("unimplemented: a promise settle callback needs its host reference");
}
const payload = table.Get(self.Ref).Host;
if (payload === null) throw new Error("unimplemented: a promise settle callback without a payload");
return Value.FromObject(payload.Opaque);
```

# method MakePromise:(room:RoomChecker, table:HeapTable, protos:Protos, state:int, settled:Value)=>Value

**造一个承诺**。

**方法不挂在实例上**（第 697 轮改）：`then` / `catch` / `finally` 第 690 轮就在
`Promise.prototype` 上（`Object.getOwnPropertyNames(Promise.prototype)` 与 Node
逐字相同：`constructor` / `then` / `catch` / `finally`），再在实例上挂一份就是**第二份账**——
它的症状是 `Object.getOwnPropertyNames(promise)` 里凭空多出三格
（Node 给 `[]`，判据 `runtime/async/probe697-z15`）。
**原来是「与 `Map` / `Set` 同一条口径（实例方法）」**：那两族第 341 轮就搬到原型上了，
所以这条口径**在自己的注释里就已经过期**。

**原型那一格必须有**（第 601 轮）：`x instanceof Promise` 要看它，
`Symbol.toStringTag`（`"[object Promise]"`）与 `constructor` 也挂在它上面——
一个空对象，方法一个都不放。

```ts
if (!room(ObjectCharge + ValueCharge * 3)) throw new Error("out of room");
const handle = table.CreatePromise(state, settled);
const promise = Value.FromObject(handle);
if (protos.Promise > 0) {
  table.Get(promise.Ref).Proto = protos.Promise;
}
return promise;
```

# method IsPromise:(table:HeapTable, value:Value)=>bool

**它是不是一个承诺**——看载荷那一格（与引擎同一条判据）。

```ts
if (!value.IsObject()) return false;
return table.Get(value.Ref).Promise !== null;
```

# method SetNumberProp:(room:RoomChecker, table:HeapTable, object:Value, name:string, value:Value)=>void

**给一个普通对象写一格属性**（`Promise.all` 的状态对象要用）。

```ts
SetProperty(room, NeverCall, table, object,
  Value.FromString(table.CreateString(Units(name))), value);
```

# method ReadProp:(room:RoomChecker, table:HeapTable, protos:Protos, object:Value, name:string)=>Value

**读一个普通对象上的一格**（状态对象那两格）。

```ts
return GetProperty(room, NeverCall, protos, table, object,
  Value.FromString(table.CreateString(Units(name))));
```

# method InvokePromise:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, schedule:TaskScheduler | null, settle:TaskSettler | null, invoke:InvokeCallback | null, takeThrown:ThrownTaker | null)=>Value

**承诺族的实现**（号段 230..239，由 `install.xl.md` 那一层分派到这儿）。

**`schedule` 是引擎给的**（五样东西：源承诺 / 回调 / 实参 / 结果承诺 / 认哪一档）；
**宿主没接这一格时它是 `null`**——那时这一族**响亮地抛**
（不静默给一个永远不结清的承诺：那种「看着像跑通了」最难查）。

```ts
// **两步回调排在最前**：它们**不是静态方法**，而是语言层自己造的宿主回调
// （`Promise.all` / `race` 给每个输入挂一步）——引擎结清一个输入时会**回调到这儿**
// （`CallNative` 见到宿主引用就转给宿主通道，于是又回到这个分派）。
// **漏了这两支的症状是 `unimplemented: promise builtin id 238`**
// ——那句话听起来像「有个静态方法没实现」，其实是「回调没人接」。
if (id === PromiseAllStepId) return PromiseAllStep(room, table, protos, self, args, settle);
// **`Array.fromAsync` 的两步**（第 369 轮）：与上面那几步**同一个形状**——
// 号在家族里、状态走 `schedule` 的实参表。
if (id === PromiseArrayFromStepId) return PromiseArrayFromStep(room, table, protos, args, invoke, schedule, settle, takeThrown);
if (id === PromiseArrayFromMapStepId) return PromiseArrayFromMapStep(room, table, protos, args, invoke, schedule, settle, takeThrown);
// **`for await` 那条异步迭代器路的「等一步」**（第 643 轮）：与上面两步同一形状。
if (id === AsyncIterableStepId) return AsyncIterableStep(room, table, protos, args, invoke, schedule, settle, takeThrown);
if (id === PromiseThenableAdopt) {
  // **引擎问的这一句**（第 359 轮）：见那个号与 `PromiseThenableStep` 的账。
  return PromiseThenableStep(room, table, protos, args, invoke, settle, takeThrown);
}
if (id === PromiseRaceStepId) return PromiseRaceStep(room, table, protos, self, args, settle);
// **第 295 轮那四步**（`allSettled` 两档、`any` 两档）：同一处收口——
// 它们的形状与上面两步一字不差（引擎回调到这儿），差的只是**收到值之后干什么**。
// `mode` 就是「哪一个号」：`0/1` = `allSettled` 的兑现/拒绝、`2/3` = `any` 的兑现/拒绝。
if (id === PromiseSettledStepId) return PromiseCollectStep(room, table, protos, 0, args, settle);
if (id === PromiseRejectedStepId) return PromiseCollectStep(room, table, protos, 1, args, settle);
if (id === PromiseAnyStepId) return PromiseCollectStep(room, table, protos, 2, args, settle);
if (id === PromiseAnyRejectStepId) return PromiseCollectStep(room, table, protos, 3, args, settle);
// **执行器递出去的那两个也要接住**（第 285 轮）：它们与上面那两步**同一条形状**
// ——语言层自己造的宿主回调，回到这个分派。
// **「哪一个承诺」在 `self` 里**：`MakeSettleCallback` 把它写进了宿主引用的 `Opaque`
// ——**不是**实参（脚本调 `resolve(5)` 时那一个实参是**兑现值**）。
if (id === PromiseResolveCallbackId) {
  if (settle === null) {
    throw new Error("unimplemented: a promise settle callback needs the settle channel");
  }
  const value = args.length > 0 ? args[0] : Value.Undefined();
  settle(SettleOfCallback(table, self), value, false);
  return Value.Undefined();
}
if (id === PromiseRejectCallbackId) {
  if (settle === null) {
    throw new Error("unimplemented: a promise settle callback needs the settle channel");
  }
  const reason = args.length > 0 ? args[0] : Value.Undefined();
  settle(SettleOfCallback(table, self), reason, true);
  return Value.Undefined();
}
if (id === PromiseQueueMicrotask) {
  // **`queueMicrotask(回调)`**（第 332 轮）：源那一格给 `undefined`——
  // 引擎对「源根本不是承诺」的处理是**直接排队、不接任何值** ⇒ 回调收到零个实参
  //（给一个已兑现的承诺会把兑现值接在实参后面——见号那一段）。
  if (schedule === null) {
    throw new Error("unimplemented: queueMicrotask needs the task channel (the host did not provide it)");
  }
  const callback = args.length > 0 ? args[0] : Value.Undefined();
  // **结果承诺没人看**，但它必须在：回调里抛出来的那一抛要有个去处
  //（引擎把那一抛变成这个承诺的拒绝）——**这正是 JS 里 `queueMicrotask` 抛了会变成
  // 一个未处理的错误**，本仓于是也不会把它冒成宿主异常。
  const anchor = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
  schedule(Value.Undefined(), callback, [], anchor, 0, false, Value.Undefined());
  return Value.Undefined();
}
if (id === PromiseResolve) {
  const value = args.length > 0 ? args[0] : Value.Undefined();
  // **`Promise.resolve(p) === p` 要是真**（第 377 轮）：JS 的口径是
  // 「实参**已经是**这一族造出来的承诺 ⇒ **原样交回**」（`Promise.resolve(p)` 不套一层）。
  // **原来一律包一个新的** ⇒ 身份不等（`===` 给假），而「包一层」在语义上
  // 几乎总是等价——**只有身份比较看得出来**，所以它一直没被查到
  //（判据 `c371-stdlib-promise-resolve-identity` 量的就是这一格）。
  // **判据是现成的**（`IsPromise`，第 285 轮就有）——不另写一份「这是不是我们的承诺」
  //（`MakePromise` 造出来的那一族认它，宿主自己的 thenable 不认——那正是不该原样交回的那些）。
  if (IsPromise(table, value)) {
    return value;
  }
  // **可采纳对象要排进一个微任务再审**（第 601 轮）：JS 的解决过程里
  // `Promise.resolve(thenable)` 不是当场调那个 `then`，而是排一个
  // **PromiseResolveThenableJob**。次序看得出来：`Promise.resolve(t);
  // Promise.resolve(2).then(…)` 在 Node 里先印那个普通值——
  // 当场采纳的话 thenable 那一格会**抢在前面**（判据 `c371-stdlib-promise-resolve-identity` 量的正是这一格）。
  //
  // **排进微任务的机关是现成的**：`schedule` 那一格（`PromiseQueueMicrotask` 用的就是它）
  // 加 `PromiseThenableAdopt` 那个号（引擎结清时问的那一句、做的事与这里要的**一字不差**
  // ——它就是「把 `then` 接上这个承诺」）。**不另写一份采纳**。
  // **结果承诺给一个占位的锚**：任务跑完的返回值会灌进它（`RunNativeTask` 的规矩），
  // 而真正的结果在 `produced` 上——不隔开的话那句 `true` 会把 `produced` 结清成 `true`。
  if (ThenMethodOf(room, table, protos, value, invoke).Tag !== ValueTag.Undefined) {
    if (schedule === null) {
      throw new Error("unimplemented: Promise.resolve of a thenable needs the task channel");
    }
    const produced = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
    const anchor = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
    const job = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseThenableAdopt, 0));
    const jobArgs: Value[] = [produced, value];
    schedule(Value.Undefined(), job, jobArgs, anchor, 0, false, Value.Undefined());
    return produced;
  }
  return MakePromise(room, table, protos, PromiseState.Fulfilled, value);
}
if (id === PromiseReject) {
  const value = args.length > 0 ? args[0] : Value.Undefined();
  return MakePromise(room, table, protos, PromiseState.Rejected, value);
}
if (id === PromiseWithResolvers) {
  // **`Promise.withResolvers()`**（第 327 轮）——三样一起交出去：
  // 一个**待结清**的承诺（`MakePromise` 顺手把三个方法挂上）、
  // 一对结清回调（`MakeSettleCallback`，第 285 轮那一对）。
  //
  // **房间先问齐**（与 `MakePromise` / 这一层别处同一条纪律）：
  // 一个普通对象 + 三格值——**问到一半才失败**的话，前面造出来的东西
  // 已经挂在那儿了（这一层没有「回滚」）。
  if (!room(ObjectCharge * 2 + ValueCharge * 3)) throw new Error("out of room");
  const pendingPromise = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
  const resolvers = NewPlainObject(room, table, protos);
  SetNumberProp(room, table, resolvers, "promise", pendingPromise);
  SetNumberProp(room, table, resolvers, "resolve", MakeSettleCallback(table, pendingPromise, false));
  SetNumberProp(room, table, resolvers, "reject", MakeSettleCallback(table, pendingPromise, true));
  return resolvers;
}
// **`Promise.try(回调, …实参)`**（第 331 轮，ES2025）——
// **同步调一次那个回调**，把「返回了什么 / 抛了什么」收成**一个承诺**。
//
// **它不是 `Promise.resolve(回调())`**：那样写有两个错——
// 回调是**当场跑**的（这一条两边一样），可 `Promise.resolve(…)` 在 `f` **抛**时
// 会把**整段代码**打断，而 `Promise.try` 要的是**把它变成一份拒绝**
//（调用者那一句照样跑完，与 `new Promise(执行器)` 那一支**同一条口径**）。
//
// **它不是 `new Promise(r => r(f()))`**：形状对得上，但多绕一层、
// 还多挂两个结清回调——零件全是现成的（`MakePromise` / `invoke` /
// `takeThrown` / `settle`），一个字的特例都不用加。
//
// **兑现那一格会自动采纳承诺**（`settle` 走 `ResolvePromise`，第 317 轮）——
// 所以 `Promise.try(async () => 1)` 给的是**那个内层承诺的结果**，不是承诺套承诺。
if (id === PromiseTry) {
  if (invoke === null) {
    throw new Error("unimplemented: Promise.try needs the invoke channel (the host did not provide it)");
  }
  if (settle === null) {
    throw new Error("unimplemented: Promise.try needs the settle channel");
  }
  if (takeThrown === null) {
    throw new Error("unimplemented: Promise.try needs the thrown channel");
  }
  const callback = args.length > 0 ? args[0] : Value.Undefined();
  // **其余实参原样转给回调**（JS 的 `Promise.try(f, a, b)` 就是 `f(a, b)`）——
  // 从第 1 格起切（第 0 格是回调自己）。
  const rest: Value[] = [];
  for (let i = 1; i < args.length; i++) rest.push(args[i]);
  const produced = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
  // **接收者给 `undefined`**：JS 里 `Promise.try(f)` 的 `f` 是**普通调用**
  //（松散模式下 `this` 是全局对象，本仓一律给 `undefined`——与整仓同一条口径）。
  // **同步返回也要走 `settle`**（不是「已经兑现的承诺」那一条捷径）：
  // 语义上它照样要让出一个 tick，而两条路在这里**合流**——
  // 引擎那一侧 `settle` 会把等着它的帧排进微任务。
  const returned = invoke(callback, Value.Undefined(), rest);
  const thrown = takeThrown();
  if (thrown.Tag !== ValueTag.Undefined) {
    settle(produced, thrown, true);
    return produced;
  }
  settle(produced, returned, false);
  return produced;
}
if (id === PromiseAll || id === PromiseRace || id === PromiseAllSettled || id === PromiseAny) {
  if (schedule === null) {
    throw new Error("unimplemented: Promise.all/race/allSettled/any needs the task channel (the host did not provide it)");
  }
  const source = args.length > 0 ? args[0] : Value.Undefined();
  if (source.Tag !== ValueTag.Array) {
    throw new Error("unimplemented: Promise.all/race/allSettled/any needs an array of promises");
  }
  const count = table.Get(source.Ref).AsArray().GetLength();
  // **语言层现在能结清一个承诺了**（第 186 轮）：引擎多给了一格 `settle`
  // （`ResolvePromise` / `RejectPromise` 的包装）。
  // **这一步是必须的**：自己改状态**不行**——那只把状态改了、
  // 没有把等着它的回调排进微任务（第 185 轮实测过：脚本一声不响地结束）。
  if (settle === null) {
    throw new Error("unimplemented: Promise.all/race needs the settle channel (the host did not provide it)");
  }
  const result = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
  // **状态住在堆里**（不是建库层的局部量）：每一步回调是**另一次调用**，
  // 建库层没有「上一次」可记——所以「还差几个」与「已经收到哪些值」都得进堆。
  const state = NewPlainObject(room, table, protos);
  SetNumberProp(room, table, state, "remaining", Value.FromInt(count));
  // **要收值的那两条各收各的**（第 295 轮把 `allSettled` / `any` 接上）：
  // `all` / `allSettled` 收**结果**（按输入下标）、`any` 收**拒绝原因**。
  const collects = id === PromiseAll || id === PromiseAllSettled;
  if (collects || id === PromiseAny) {
    const box = NewPlainArray(room, table, protos);
    for (let i = 0; i < count; i++) {
      if (!room(ValueCharge)) throw new Error("out of room");
      table.Get(box.Ref).AsArray().Push(Value.Undefined());
    }
    SetNumberProp(room, table, state, collects ? "values" : "errors", box);
  }
  // **空数组那一档**（JS 的口径）：`all([])` 兑现成 `[]`、`allSettled([])` 也是 `[]`、
  // **`any([])` 拒绝成 `AggregateError`**（一条都没兑现、也没有原因）、
  // **`race([])` 永不结清**。
  if (count === 0) {
    if (id === PromiseAll || id === PromiseAllSettled) {
      settle(result, ReadProp(room, table, protos, state, collects ? "values" : "errors"), false);
      return result;
    }
    if (id === PromiseAny) {
      settle(result, NewAggregateError(room, table, protos, ReadProp(room, table, protos, state, "errors"), ""), true);
      return result;
    }
    return result;
  }
  // **四个静态方法各挑各的兑现步**（第 295 轮实测踩过）：
  // 第一版把 `any` 也指到 `PromiseSettledStepId`——那一步往 `state.values` 里写记录，
  // 而 `any` 造的是 `state.errors` ⇒ 那一格**根本不存在** ⇒ 最后一个到齐时
  // `settle(result, ReadProp(state, "values"), false)` 把 **`undefined`** 兑现出去
  //（**静默错值**：`Promise.any([Promise.resolve(3)])` 打出 `a undefined`，
  //  而 `allSettled` 一字不差是对的——**一半对一半错**最难查）。
  const step = id === PromiseAll ? PromiseAllStepId
    : (id === PromiseRace ? PromiseRaceStepId
      : (id === PromiseAllSettled ? PromiseSettledStepId : PromiseAnyStepId));
  const stepValue = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(step, 0));
  // **第 295 轮那两条要两个回调**（`wants = 3`，与 `.then(f, g)` 同一格）：
  // 「兑现」与「拒绝」各一个号——引擎只把结清值接在实参后面，
  // **不告诉回调这是哪一档**（理由写在 `PromiseRejectedStepId` 那一段）。
  const rejectStep = id === PromiseAllSettled ? PromiseRejectedStepId
    : (id === PromiseAny ? PromiseAnyRejectStepId : 0);
  const rejectStepValue = rejectStep === 0
    ? Value.Undefined()
    : Value.FromRef(ValueTag.HostRef, table.CreateHostRef(rejectStep, 0));
  for (let i = 0; i < count; i++) {
    const item = table.Get(source.Ref).AsArray().GetAt(i);
    // **不是承诺的项要当「已经兑现为它自己」**（第 247 轮）——
    // JS 的 `Promise.all` 对每一项都先做一次 `Promise.resolve`：
    // `Promise.all([1, Promise.resolve(2), "3"])` 给 `[1, 2, 3]`。
    //
    // **原来直接把它交给调度器**：调度器只认承诺（它的工作是「挂在那个承诺的反应表上」），
    // 拿一个**数字**去挂，那一格**永远不会有反应被触发**——
    // 于是那一步的 `remaining` **永远减不到 0**、结果承诺**永不结清**。
    // **实测的现场**（判据 `promise-all-kinds` / `prm-combinators`）：
    // `Promise.all([1, Promise.resolve(2), "3"])` 打出 `mixed ,2,`
    //（第 1、3 项是**空串**——那两格从来没被写过），而 Node 给 `mixed 1,2,3`。
    // **它不报错** ⇒ **静默错值**，正是最该先修的那一类
    //（第 244 轮量出的「引擎抛的错要能进脚本的错路」那一族修完之后，这两条就露出来了）。
    //
    // **为什么不「直接调一步」**：那样 `all` 与 `race` 两条路要各写一遍、
    // 而且「同步调一步」与「承诺结清后调一步」的**次序**会不同（JS 里两者都走微任务）。
    // **包一个已兑现的承诺**是最短的一条——形状与 `PromiseResolve` 那一支**一字不差**。
    const one = IsPromise(table, item)
      ? item
      : MakePromise(room, table, protos, PromiseState.Fulfilled, item);
    // **`all` 只认兑现那一档**（某一步被拒绝时**回调不跑**、
    // 拒绝顺着「结果承诺」自动传下去——那正是 JS 的语义）；
    // **`race` 两档都认**（谁先结清谁定）；
    // **`allSettled` / `any` 两档都收、但收到的东西不同**（第 295 轮）
    // ——所以它们走 `wants = 3`（两个回调），而 `all` / `race` 走 0 / 2。
    const wants = id === PromiseAll ? 0 : (id === PromiseRace ? 2 : 3);
    schedule(one, stepValue, [state, Value.FromInt(i), result], result, wants, false, rejectStepValue);
  }
  return result;
}
if (id === PromiseThen || id === PromiseCatch) {
  if (schedule === null) {
    throw new Error("unimplemented: Promise.prototype.then needs the task channel (the host did not provide it)");
  }
  if (!IsPromise(table, self)) {
    throw new Error("unimplemented: .then/.catch needs a promise receiver");
  }
  const callback = args.length > 0 ? args[0] : Value.Undefined();
  const result = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
  // **认哪一档**：`then(f)` 只认兑现、`catch(g)` 只认拒绝、
  // `then(f, g)` **两档各一个**（第 187 轮——`wants = 3`，引擎按结清的那一档挑）。
  const wants = id === PromiseCatch ? 1 : (args.length > 1 ? 3 : 0);
  const onRejected = args.length > 1 ? args[1] : Value.Undefined();
  schedule(self, callback, [], result, wants, true, onRejected);
  return result;
}
if (id === PromiseFinally) {
  // **`.finally(cb)`**（第 187 轮）：两档都调、然后**把源那一档原样传下去**
  // ——回调的返回值**不算数**（`wants = 4`，引擎里那一支管着）。
  if (schedule === null) {
    throw new Error("unimplemented: Promise.prototype.finally needs the task channel (the host did not provide it)");
  }
  if (!IsPromise(table, self)) {
    throw new Error("unimplemented: .finally needs a promise receiver");
  }
  const callback = args.length > 0 ? args[0] : Value.Undefined();
  const result = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
  schedule(self, callback, [], result, 4, false, Value.Undefined());
  return result;
}
if (id === PromiseCtor) {
  // **`new Promise(执行器)`**（第 285 轮）：执行器要**同步跑一次**
  //（JS 的口径：`new Promise((r) => { console.log("x"); r(1) })` 在**这一句**里印 `x`），
  // 拿到两个**结清回调**——`(resolve, reject)`。
  //
  // **执行器自己抛 ⇒ 结果承诺被拒绝**（JS 的口径）：那一抛不能变成宿主错误
  //（`new Promise(() => { throw new Error("x") }).catch(e => …)` 在 Node 里接得住）。
  // 判据是引擎给的 `TakeThrown`（见 `vm.xl.md`）——**不是**一个宿主 `try`：
  // 脚本异常在本仓里**不是**宿主异常（它从 `CallNative` 里出来时状态已经变了，
  // 值留在 `Pending` 里）——用宿主 `try` 接只会接到引擎内部的 bug。
  //
  // **没有执行器 ⇒ 一个永远等着的承诺**（`new Promise()` 在 JS 里是 `TypeError`，
  // 而那一条**响亮的报**留给判据——引擎这一格不替它决定）。
  //
  // **没接通道就响亮地抛**（与 `.then` 那几支同一条纪律）：
  // 静默给一个永远不结清的承诺是最难查的一种。
  if (args.length > 0 && args[0].Tag !== ValueTag.Undefined) {
    if (invoke === null) {
      throw new Error("unimplemented: new Promise(executor) needs the invoke channel (the host did not provide it)");
    }
    if (settle === null) {
      throw new Error("unimplemented: new Promise(executor) needs the settle channel");
    }
    if (takeThrown === null) {
      throw new Error("unimplemented: new Promise(executor) needs the thrown channel");
    }
    const result = MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
    const onFulfilled = MakeSettleCallback(table, result, false);
    const onRejected = MakeSettleCallback(table, result, true);
    const executor = args[0];
    const pair: Value[] = [];
    pair.push(onFulfilled);
    pair.push(onRejected);
    // **执行器按方法调**（`invoke` 是引擎那条「同步调一个脚本值」的通道）：
    // 接收者给**那个承诺本身**、实参是 `(resolve, reject)`。
    //
    // **接收者还没解决问题**（第 286 轮量清）：脚本里 `resolve` 是**自己当普通函数**
    // 调的（`(resolve) => resolve(1)`），所以执行器有接收者**传不到 `resolve` 身上**
    // ——真相写在 `MakeSettleCallback` 那一段（两条候选与下一轮最短的一步）。
    invoke(executor, result, pair);
    // **执行器抛出来的那一抛：把结果拒绝掉**（`takeThrown` 取走即清，
    // 顺手把状态放回去——外层那一段脚本还要接着跑）。
    const thrown = takeThrown();
    if (thrown.Tag !== ValueTag.Undefined) {
      settle(result, thrown, true);
    }
    return result;
  }
  return MakePromise(room, table, protos, PromiseState.Pending, Value.Undefined());
}
throw new Error("unimplemented: promise builtin id " + id);
```

# method PromiseAllStep:(room:RoomChecker, table:HeapTable, protos:Protos, self:Value, args:Array<Value>, settle:TaskSettler | null)=>Value

**`Promise.all` 的一步**——引擎在某个输入结清时调它一次，
实参是 `(状态, 下标, 结果承诺, 那个输入的兑现值)`（结清值是引擎**接在最后**的）。

**收值的形状**：按**下标**放进 `values`（JS 的顺序是**输入顺序**，
不是结清顺序）——所以答案与「谁先回来」无关。

**最后一个到齐才结清结果**。

**被拒绝的那一档不进来**（引擎按 `wants` 跳过了），
于是结果承诺由引擎**直接拒绝**——那正是 JS 要的。

```ts
const state = args.length > 0 ? args[0] : Value.Undefined();
const index = args.length > 1 ? args[1].AsInt() : 0;
const result = args.length > 2 ? args[2] : Value.Undefined();
const produced = args.length > 3 ? args[3] : Value.Undefined();
if (!state.IsObject() || !result.IsObject()) return Value.Undefined();
const remaining = ReadProp(room, table, protos, state, "remaining");
const values = ReadProp(room, table, protos, state, "values");
if (values.Tag === ValueTag.Array && index >= 0) {
  table.Get(values.Ref).AsArray().SetAt(index, produced);
}
const left = remaining.AsInt() - 1;
SetNumberProp(room, table, state, "remaining", Value.FromInt(left));
if (left <= 0) {
  // **答案交给引擎去交**（第 186 轮）：`settle` 就是 `ResolvePromise`——
  // 它会把等着这个承诺的回调**排进微任务**（自己改状态做不到这一步）。
  if (settle === null) {
    throw new Error("unimplemented: Promise.all needs the settle channel");
  }
  settle(result, values, false);
}
return Value.Undefined();
```

# method PromiseRaceStep:(room:RoomChecker, table:HeapTable, protos:Protos, self:Value, args:Array<Value>, settle:TaskSettler | null)=>Value

**`Promise.race` 的一步**——**第一个**结清的定胜负。

**幂等**：结果已经被别人结清了，这一趟就什么也不做
（那一步的 `State !== Pending` 一判就挡住了）。

```ts
const result = args.length > 2 ? args[2] : Value.Undefined();
const produced = args.length > 3 ? args[3] : Value.Undefined();
if (!result.IsObject()) return Value.Undefined();
if (settle === null) {
  throw new Error("unimplemented: Promise.race needs the settle channel");
}
// **幂等交给引擎**（`ResolvePromise` 自己会判 `Pending`）——
// 「谁先结清谁定」不需要这里再判一次（两处判据迟早走偏）。
settle(result, produced, false);
return Value.Undefined();
```

# method NewAggregateError:(room:RoomChecker, table:HeapTable, protos:Protos, errors:Value, message:string)=>Value

**造一个 `AggregateError`**（第 295 轮）——`Promise.any` 全部被拒绝时抛的就是它。

**为什么这里自己造、不转调 `globals.xl.md` 的 `NewErrorLike`**：依赖方向是
**`globals` → `promise`**（`globals.xl.md` 要 import `BuildPromise`）——
反过来 import 就是**环形依赖**。而这一段只有四行（造对象、接原型、
`message` / `name` 两个不可枚举的格、`errors` 一格），抄一份的代价比造环小。
**四行与 `NewErrorLike` 的差别只有 `errors` 那一格**（它**是可枚举的**——
JS 里 `AggregateError.prototype.errors` 是自有属性、`message` / `name` 在原型上；
本仓两者都挂自有，那一条差异记在台账里）。

```ts
const aggregate = NewPlainObject(room, table, protos);
table.Get(aggregate.Ref).Proto = protos.AggregateError;
SetHiddenProperty(room, table, aggregate, NameValue(table, "message"),
  Value.FromString(table.CreateString(Units(message))));
SetHiddenProperty(room, table, aggregate, NameValue(table, "name"),
  Value.FromString(table.CreateString(Units("AggregateError"))));
SetProperty(room, NeverCall, table, aggregate, NameValue(table, "errors"), errors);
return aggregate;
```

# method PromiseCollectStep:(room:RoomChecker, table:HeapTable, protos:Protos, mode:int, args:Array<Value>, settle:TaskSettler | null)=>Value

**`allSettled` / `any` 的那一步**（第 295 轮）——四种情形共用一个方法，
`mode` 就是「哪一个号」：`0` = `allSettled` 的兑现、`1` = `allSettled` 的拒绝、
`2` = `any` 的兑现、`3` = `any` 的拒绝。

**收值的形状**：`allSettled` 按**下标**放进 `values`
（JS 的顺序是**输入顺序**，不是结清顺序）——与 `PromiseAllStep` 同一条规矩；
`any` 把拒绝原因按下标放进 `errors`（**全部被拒绝**时那个 `AggregateError` 要按顺序装）。

**`any` 的兑现当场定胜负**（第一个兑现的就是答案）：幂等交给引擎
（`ResolvePromise` 自己判 `Pending`，与 `PromiseRaceStep` 一字不差）。

**`allSettled` 永远兑现**：两档都往 `values` 里写一格，最后一个到齐才结清
——**拒绝那一条也走同一个出口**（这正是它与 `all` 的唯一区别）。

```ts
const state = args.length > 0 ? args[0] : Value.Undefined();
const index = args.length > 1 ? args[1].AsInt() : 0;
const result = args.length > 2 ? args[2] : Value.Undefined();
const produced = args.length > 3 ? args[3] : Value.Undefined();
if (!state.IsObject() || !result.IsObject()) return Value.Undefined();
if (settle === null) {
  throw new Error("unimplemented: Promise.allSettled/any needs the settle channel");
}
if (mode === 2) {
  settle(result, produced, false);
  return Value.Undefined();
}
const remaining = ReadProp(room, table, protos, state, "remaining");
if (mode === 3) {
  const errors = ReadProp(room, table, protos, state, "errors");
  if (errors.Tag === ValueTag.Array && index >= 0) {
    table.Get(errors.Ref).AsArray().SetAt(index, produced);
  }
} else {
  // **`allSettled` 的那个记录**：`{ status, value }` / `{ status, reason }`——
  // **先问 room、再分配**（与 `Promise.all` 那段同一个理由：
  // 下面那两句 `SetProperty` 自己也会问 room，触发回收时它还没有人指着）。
  if (!room(ObjectCharge + PropertyCharge * 2 + ValueCharge * 4)) throw new Error("out of room");
  const record = NewPlainObject(room, table, protos);
  const statusText = mode === 0 ? "fulfilled" : "rejected";
  const detailName = mode === 0 ? "value" : "reason";
  SetProperty(room, NeverCall, table, record, NameValue(table, "status"),
    Value.FromString(table.CreateString(Units(statusText))));
  SetProperty(room, NeverCall, table, record, NameValue(table, detailName), produced);
  const values = ReadProp(room, table, protos, state, "values");
  if (values.Tag === ValueTag.Array && index >= 0) {
    table.Get(values.Ref).AsArray().SetAt(index, record);
  }
}
const left = remaining.AsInt() - 1;
SetNumberProp(room, table, state, "remaining", Value.FromInt(left));
if (left > 0) return Value.Undefined();
if (mode === 1) {
  settle(result, ReadProp(room, table, protos, state, "values"), false);
  return Value.Undefined();
}
if (mode === 0) {
  settle(result, ReadProp(room, table, protos, state, "values"), false);
  return Value.Undefined();
}
settle(result, NewAggregateError(room, table, protos,
  ReadProp(room, table, protos, state, "errors"), "All promises were rejected"), true);
return Value.Undefined();
```

# method BuildPromise:(vm:Vm, protos:Protos)=>Value

**造 `Promise` 这个名字**——调用方（`globals.xl.md` 的 `InstallGlobals`）
负责把它挂进全局对象（与 `Array` / `Date` 那几格同一个形状）。

**它同时是对象又是构造函数**：`Promise.resolve(1)` 走属性、
`new Promise(执行器)` 走 `Op.New` 的宿主那一支（`AttachCallable`，与 `Date` 同款）。

```ts
const room = vm.Room();
const table = vm.Table;
const promiseObject = NewPlainObject(room, table, protos);
table.AttachCallable(promiseObject.Ref, PromiseCtor, 0);
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "resolve"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseResolve, 0)));
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "reject"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseReject, 0)));
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "all"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseAll, 0)));
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "race"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseRace, 0)));
// **第 295 轮补的两格**（`allSettled` / `any`）——与上面四个**同一张对象**上再挂。
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "allSettled"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseAllSettled, 0)));
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "any"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseAny, 0)));
// **第 327 轮补的一格**（`withResolvers`）——与上面六个**同一张对象**上再挂
//（名字与号**一一对齐**：`PromiseWithResolvers = 248`，而 `248` 正是这一段的下一格）。
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "withResolvers"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseWithResolvers, 0)));
// **第 331 轮补的一格**（`try`）——与上面七个**同一张对象**上再挂。
// **它是「同步跑、异步收」那一格**：回调当场跑，而结果承诺照样让出一个 tick。
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "try"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseTry, 0)));
// **`Promise.prototype.constructor` 指回这一份**（第 613 轮）：
// `Promise.resolve(1).constructor === Promise` 要走**原型上那一格**
// （实例没有自有的 `constructor`），少了它 `x.constructor.name` 给
// `undefined`——**静默错值**（判据 `c371-stdlib-promise-allsettled-any-race`）。
// **`prototype` 属性本身由 `globals.xl.md` 挂**（那是「全局名 → 那一份值」的关系，
// 属于挂全局表那一层的活，与 `Array` / `Map` 那几格同一个分工）。
SetHiddenProperty(room, table, Value.FromObject(protos.Promise), NameValue(table, "constructor"), promiseObject);
return promiseObject;
```
