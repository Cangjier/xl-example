# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, PromiseState } from "../../runtime/heap.xl.md"
import { RoomChecker } from "../../runtime/rt.xl.md"
import { Protos, SetProperty, GetProperty, NewPlainObject, NewPlainArray, NeverRoom } from "../../runtime/props.xl.md"
import { Vm, TaskScheduler, TaskSettler } from "../../runtime/vm.xl.md"
import { Units, NeverCall } from "./array.xl.md"
import { NameValue } from "./map.xl.md"
```

# namespace cangjie

**`Promise`**（第 185 轮）。

引擎那一侧**早就有承诺** ✓：`HeapPromise`（状态 + 兑现值 + 等着它的那些帧 ✓）、
微任务队列 ✓、`await` 的挂起与恢复 ✓。缺的从来是**语言层那一格** ✗：
`Promise` 不是全局名 ✓、承诺上没有 `.then` ✓。

**这一层要补两件事** ✓：

1. **`Promise` 这个名字**（`resolve` / `reject` / `all` / `race` ✓）——挂在一个
   **既是对象又能被 `new`** 的值上 ✓（与 `Date` 同一个形状 ✓：`AttachCallable` ✓）；
2. **承诺上的 `then` / `catch`** ✓——**逐个实例挂** ✓
   （与 `Map` / `Set` 同一条路 ✓：那两族的原型**不挂方法** ✓，方法挂在实例上 ✓）。

**推迟那一半由引擎做** ✗（不是这一层 ✓）：`.then(f)` 的 `f` 必须在**微任务**里跑 ✓
（`Promise.resolve(1).then(f); console.log("x")` 在 Node 里先印 `x` ✓）。
建库层拿到的 `call` 是**同步重入** ✗，做不出「推迟」✓——所以这一层只说
「**源承诺、回调、实参、结果承诺、认哪一档**」五样 ✓，
由执行器（`vm.xl.md` 的 `ScheduleTask` ✓）去排、去调 ✓。

**三条写在明处的缺口** ✗：`x instanceof Promise`（方法挂在实例上 ✓、原型表里没有那一格 ✗）、
`Promise.then(f, g)` 两个实参的形式 ✗（一步只有一个回调 ✓）、
`Promise.finally` ✗（要「调完再把原来那一档传下去」✓，而引擎现在只会拿返回值灌结果 ✗）。

# const PromiseCtor:int = 230

**`Promise` 这个值本身的号**（也是 `new Promise(执行器)` 的号 ✓）。

# const PromiseResolve:int = 231

**`Promise.resolve(值)`** ✓——已兑现的承诺 ✓。

# const PromiseReject:int = 232

**`Promise.reject(原因)`** ✓——已拒绝的承诺 ✓。

# const PromiseAll:int = 233

**`Promise.all(数组)`** ✓。

# const PromiseRace:int = 234

**`Promise.race(数组)`** ✓。

# const PromiseThen:int = 235

**`承诺.then(回调)`** ✓。

# const PromiseCatch:int = 236

**`承诺.catch(回调)`** ✓——就是「只认拒绝那一档」的 `then` ✓。

# const PromiseFinally:int = 237

**`承诺.finally(回调)`** ✓——**还没做** ✗（见文首那三条缺口 ✓）。

# const PromiseAllStepId:int = 238

**`Promise.all` 的每一步** ✓——引擎结清一个输入时调它一次 ✓。

# const PromiseRaceStepId:int = 239

**`Promise.race` 的第一步** ✓。

# method MakePromise:(room:RoomChecker, table:HeapTable, state:int, settled:Value)=>Value

**造一个承诺，并把两个方法挂在它自己身上** ✓。

**为什么挂在实例上** ✗：与 `Map` / `Set` 同一条口径 ✓（那两族的原型**不挂方法** ✓）。
**这条路今天最省** ✓：不必给引擎的原型表再加一格 ✓（`protos.Promise` ✗），
代价是 `x instanceof Promise` **还不成立** ✗（记在文首 ✓）。

**两个方法都是宿主引用** ✓——所以它们是**同一份**实现 ✓，
每造一个承诺只花两次属性写的钱 ✓。

```ts
if (!room(ObjectCharge + ValueCharge * 3)) throw new Error("out of room");
const handle = table.CreatePromise(state, settled);
const promise = Value.FromObject(handle);
SetProperty(room, NeverCall, table, promise, NameValue(table, "then"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseThen, 0)));
SetProperty(room, NeverCall, table, promise, NameValue(table, "catch"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseCatch, 0)));
return promise;
```

# method IsPromise:(table:HeapTable, value:Value)=>bool

**它是不是一个承诺** ✓——看载荷那一格 ✓（与引擎同一条判据 ✓）。

```ts
if (!value.IsObject()) return false;
return table.Get(value.Ref).Promise !== null;
```

# method SetNumberProp:(room:RoomChecker, table:HeapTable, object:Value, name:string, value:Value)=>void

**给一个普通对象写一格属性** ✓（`Promise.all` 的状态对象要用 ✓）。

```ts
SetProperty(room, NeverCall, table, object,
  Value.FromString(table.CreateString(Units(name))), value);
```

# method ReadProp:(room:RoomChecker, table:HeapTable, protos:Protos, object:Value, name:string)=>Value

**读一个普通对象上的一格** ✓（状态对象那两格 ✓）。

```ts
return GetProperty(room, NeverCall, protos, table, object,
  Value.FromString(table.CreateString(Units(name))));
```

# method InvokePromise:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, schedule:TaskScheduler | null, settle:TaskSettler | null)=>Value

**承诺族的实现**（号段 230..239 ✓，由 `install.xl.md` 那一层分派到这儿 ✓）。

**`schedule` 是引擎给的** ✓（五样东西：源承诺 / 回调 / 实参 / 结果承诺 / 认哪一档 ✓）；
**宿主没接这一格时它是 `null`** ✓——那时这一族**响亮地抛** ✗
（不静默给一个永远不结清的承诺 ✗：那种「看着像跑通了」最难查 ✓）。

```ts
// **两步回调排在最前** ✓：它们**不是静态方法** ✓，而是语言层自己造的宿主回调 ✓
// （`Promise.all` / `race` 给每个输入挂一步 ✓）——引擎结清一个输入时会**回调到这儿** ✓
// （`CallNative` 见到宿主引用就转给宿主通道 ✓，于是又回到这个分派 ✓）。
// **漏了这两支的症状是 `unimplemented: promise builtin id 238`** ✗
// ——那句话听起来像「有个静态方法没实现」✗，其实是「回调没人接」✓。
if (id === PromiseAllStepId) return PromiseAllStep(room, table, protos, self, args, settle);
if (id === PromiseRaceStepId) return PromiseRaceStep(room, table, protos, self, args, settle);
if (id === PromiseResolve) {
  const value = args.length > 0 ? args[0] : Value.Undefined();
  return MakePromise(room, table, PromiseState.Fulfilled, value);
}
if (id === PromiseReject) {
  const value = args.length > 0 ? args[0] : Value.Undefined();
  return MakePromise(room, table, PromiseState.Rejected, value);
}
if (id === PromiseAll || id === PromiseRace) {
  if (schedule === null) {
    throw new Error("unimplemented: Promise.all/race needs the task channel (the host did not provide it)");
  }
  const source = args.length > 0 ? args[0] : Value.Undefined();
  if (source.Tag !== ValueTag.Array) {
    throw new Error("unimplemented: Promise.all/race needs an array of promises");
  }
  const count = table.Get(source.Ref).AsArray().GetLength();
  // **语言层现在能结清一个承诺了** ✓（第 186 轮 ✓）：引擎多给了一格 `settle` ✓
  // （`ResolvePromise` / `RejectPromise` 的包装 ✓）。
  // **这一步是必须的** ✗：自己改状态**不行** ✓——那只把状态改了 ✓、
  // 没有把等着它的回调排进微任务 ✗（第 185 轮实测过 ✓：脚本一声不响地结束 ✓）。
  if (settle === null) {
    throw new Error("unimplemented: Promise.all/race needs the settle channel (the host did not provide it)");
  }
  const result = MakePromise(room, table, PromiseState.Pending, Value.Undefined());
  // **状态住在堆里** ✓（不是建库层的局部量 ✗）：每一步回调是**另一次调用** ✓，
  // 建库层没有「上一次」可记 ✓——所以「还差几个」与「已经收到哪些值」都得进堆 ✓。
  const state = NewPlainObject(room, table, protos);
  SetNumberProp(room, table, state, "remaining", Value.FromInt(count));
  if (id === PromiseAll) {
    const values = NewPlainArray(room, table, protos);
    for (let i = 0; i < count; i++) {
      if (!room(ValueCharge)) throw new Error("out of room");
      table.Get(values.Ref).AsArray().Push(Value.Undefined());
    }
    SetNumberProp(room, table, state, "values", values);
  }
  // **`all([])` 当场兑现成空数组** ✓（JS 的口径 ✓）；**`race([])` 永不结清** ✓（也是 JS 的口径 ✓）。
  if (count === 0 && id === PromiseAll) {
    settle(result, ReadProp(room, table, protos, state, "values"), false);
    return result;
  }
  const step = id === PromiseAll ? PromiseAllStepId : PromiseRaceStepId;
  const stepValue = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(step, 0));
  for (let i = 0; i < count; i++) {
    const item = table.Get(source.Ref).AsArray().GetAt(i);
    // **`all` 只认兑现那一档** ✓（某一步被拒绝时**回调不跑** ✓、
    // 拒绝顺着「结果承诺」自动传下去 ✓——那正是 JS 的语义 ✓）；
    // **`race` 两档都认** ✓（谁先结清谁定 ✓）。
    const wants = id === PromiseAll ? 0 : 2;
    schedule(item, stepValue, [state, Value.FromInt(i), result], result, wants, false);
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
  // **`then(f, g)` 那两个实参的形式还不做** ✗：一步只有一个回调 ✓，
  // 而两实参形式要**两档各一个** ✓——那是「一步两条路」的形状 ✓，单独立一轮 ✓
  // （响亮地抛 ✓，不假装只做了一半 ✗）。
  if (id === PromiseThen && args.length > 1) {
    throw new Error("unimplemented: Promise.then with two arguments");
  }
  const callback = args.length > 0 ? args[0] : Value.Undefined();
  const result = MakePromise(room, table, PromiseState.Pending, Value.Undefined());
  // **认哪一档** ✓：`then` 只认兑现 ✓、`catch` 只认拒绝 ✓。
  const wants = id === PromiseThen ? 0 : 1;
  schedule(self, callback, [], result, wants, true);
  return result;
}
if (id === PromiseFinally) {
  throw new Error("unimplemented: Promise.finally (the engine cannot carry the settle kind through yet)");
}
if (id === PromiseCtor) {
  // **执行器还不做** ✗：`new Promise(exec)` 要**同步**调 `exec(兑现函数)` ✓，
  // 而这一档的工具今天只有属性与承诺两样 ✓（那条路要「造两个宿主回调 + 同步重入」✓，
  // 单独立一轮 ✓）。**给了执行器就响亮地抛** ✓，不静默给一个永远不结清的承诺 ✗。
  if (args.length > 0) {
    throw new Error("unimplemented: new Promise(executor)");
  }
  return MakePromise(room, table, PromiseState.Pending, Value.Undefined());
}
throw new Error("unimplemented: promise builtin id " + id);
```

# method PromiseAllStep:(room:RoomChecker, table:HeapTable, protos:Protos, self:Value, args:Array<Value>, settle:TaskSettler | null)=>Value

**`Promise.all` 的一步** ✓——引擎在某个输入结清时调它一次 ✓，
实参是 `(状态, 下标, 结果承诺, 那个输入的兑现值)` ✓（结清值是引擎**接在最后**的 ✓）。

**收值的形状** ✓：按**下标**放进 `values` ✓（JS 的顺序是**输入顺序** ✓，
不是结清顺序 ✓）——所以答案与「谁先回来」无关 ✓。

**最后一个到齐才结清结果** ✓。

**被拒绝的那一档不进来** ✗（引擎按 `wants` 跳过了 ✓），
于是结果承诺由引擎**直接拒绝** ✓——那正是 JS 要的 ✓。

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
  // **答案交给引擎去交** ✓（第 186 轮 ✓）：`settle` 就是 `ResolvePromise` ✓——
  // 它会把等着这个承诺的回调**排进微任务** ✓（自己改状态做不到这一步 ✗）。
  if (settle === null) {
    throw new Error("unimplemented: Promise.all needs the settle channel");
  }
  settle(result, values, false);
}
return Value.Undefined();
```

# method PromiseRaceStep:(room:RoomChecker, table:HeapTable, protos:Protos, self:Value, args:Array<Value>, settle:TaskSettler | null)=>Value

**`Promise.race` 的一步** ✓——**第一个**结清的定胜负 ✓。

**幂等** ✓：结果已经被别人结清了，这一趟就什么也不做 ✓
（那一步的 `State !== Pending` 一判就挡住了 ✓）。

```ts
const result = args.length > 2 ? args[2] : Value.Undefined();
const produced = args.length > 3 ? args[3] : Value.Undefined();
if (!result.IsObject()) return Value.Undefined();
if (settle === null) {
  throw new Error("unimplemented: Promise.race needs the settle channel");
}
// **幂等交给引擎** ✓（`ResolvePromise` 自己会判 `Pending` ✓）——
// 「谁先结清谁定」不需要这里再判一次 ✓（两处判据迟早走偏 ✗）。
settle(result, produced, false);
return Value.Undefined();
```

# method BuildPromise:(vm:Vm, protos:Protos)=>Value

**造 `Promise` 这个名字** ✓——调用方（`globals.xl.md` 的 `InstallGlobals` ✓）
负责把它挂进全局对象 ✓（与 `Array` / `Date` 那几格同一个形状 ✓）。

**它同时是对象又是构造函数** ✓：`Promise.resolve(1)` 走属性 ✓、
`new Promise(执行器)` 走 `Op.New` 的宿主那一支 ✓（`AttachCallable` ✓，与 `Date` 同款 ✓）。

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
return promiseObject;
```
