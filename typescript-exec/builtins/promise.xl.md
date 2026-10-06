# dependencies
```xl
import { Value, ValueTag } from "../../runtime/value.xl.md"
import { HeapTable, ObjectCharge, ValueCharge, PropertyCharge, PromiseState } from "../../runtime/heap.xl.md"
import { RoomChecker } from "../../runtime/rt.xl.md"
import { Protos, SetProperty, SetHiddenProperty, GetProperty, NewPlainObject, NewPlainArray, NeverRoom } from "../../runtime/props.xl.md"
import { Vm, TaskScheduler, TaskSettler, InvokeCallback, ThrownTaker } from "../../runtime/vm.xl.md"
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

# const PromiseAllSettled:int = 242

**`Promise.allSettled(数组)`**（第 295 轮 ✓）——号**追加在表尾** ✓（`230..241` 已经占了 ✓）。

**它与 `all` 只差一条** ✓：**永远兑现** ✓（每一项都变成 `{status, value}` / `{status, reason}` ✓，
`all` 则是「有一个被拒绝就整个拒绝」✓）——所以它要**两档都收** ✗
（`all` 只认兑现那一档 ✓，见下面那一支的 `wants` ✓）。

# const PromiseAny:int = 243

**`Promise.any(数组)`**（第 295 轮 ✓）——号**追加在表尾** ✓。

**它与 `race` 只差一条** ✓：**只认兑现** ✓（第一个兑现的定胜负 ✓）；
**全部被拒绝**时抛一个 **`AggregateError`** ✓（里面按输入顺序装着每一个拒绝原因 ✓）。

# const PromiseSettledStepId:int = 244

**`allSettled` 的「兑现」那一步** ✓（第 295 轮 ✓）。

# const PromiseRejectedStepId:int = 245

**`allSettled` 的「拒绝」那一步** ✓（第 295 轮 ✓）。

# const PromiseAnyStepId:int = 246

**`any` 的「兑现」那一步** ✓（第 295 轮 ✓）。

# const PromiseAnyRejectStepId:int = 247

**`any` 的「拒绝」那一步** ✓（第 295 轮 ✓）。

**为什么两步要**两个号** ✗：引擎**只把结清值接在实参后面** ✓（`Args.push(settled)` ✓），
**不告诉回调「这是哪一档」** ✗——所以「兑现」与「拒绝」只能各走一个号 ✓
（`.then(f, g)` 那一格早就用了同一招 ✓：`wants === 3` 时按 `reject` 在
`callback` 与 `onRejected` 之间挑 ✓，见 `vm.xl.md` 的 `RunNativeTask` ✓）。
**这是引擎那一格的形状决定的** ✓，不是随手多开两个号 ✓。

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

# const PromiseResolveCallbackId:int = 240

**执行器拿到的那个 `resolve`** ✓（第 285 轮 ✓）——`new Promise((resolve) => resolve(5))` ✓。

**它不是静态方法** ✗：与 `PromiseAllStepId` / `PromiseRaceStepId` 那两步同一条形状 ✓
（语言层自己造的宿主回调 ✓，由 `InvokePromise` 分派回来 ✓）。
**漏了这一支的症状**是 `unimplemented: promise builtin id 240` ✗
——那句话听起来像「有个静态方法没实现」✗，其实是「执行器递出去的那个函数没人接」✓。

# const PromiseRejectCallbackId:int = 241

**执行器拿到的那个 `reject`** ✓（第 285 轮 ✓）——`new Promise((_r, reject) => reject("no"))` ✓。

# const PromiseWithResolvers:int = 248

**`Promise.withResolvers()`**（第 327 轮 ✓）——号**追加在承诺段尾** ✓
（`230..247` 已经满了 ✓，所以号段的**上界也跟着挪一格** ✗：`install.xl.md` 那一句
`id >= 230 && id < 248` 改成 `< 249` ✓——**上界与「这一段有多少个号」是同一件事** ✓，
少挪一格就是 `unimplemented: global builtin 248` ✓，第 295 轮踩过一模一样的 ✓）。

**它是「三样东西一起交出去」** ✓：一个**待结清**的承诺 ✓ + `resolve` ✓ + `reject` ✓，
装在一个普通对象上 ✓（`{ promise, resolve, reject }` ✓）。
**一件新东西都没有** ✗：承诺走 `MakePromise` ✓（三个方法照挂 ✓）、
两个回调走 `MakeSettleCallback` ✓（第 285 轮那一对 ✓）——这一格只是**把它们装到一起** ✓。

# const PromiseTry:int = 249

**`Promise.try(回调, …实参)`**（第 331 轮 ✓，ES2025 ✓）——号**照旧追加在承诺段尾** ✓。

**上界要跟着挪第三次** ✗（`install.xl.md` 那一句 `< 249` → `< 250` ✓）：
**295 / 327 / 331 三个轮次踩的是同一处** ✓——上界与「这一段有多少个号」是**同一件事** ✓，
而症状每次都长得像「有一个全局号没实现」✓。**这一条账写在这一处，就是为了下次别再踩** ✓。

**它不是 `Promise.resolve(回调())`** ✗，也不是 `new Promise(r => r(f()))` ✗——
两条候选各自的错处写在 `InvokePromise` 那一支的说明里 ✓。**一件新东西都没有** ✓：
承诺 ✓、调用通道 ✓、取走那一抛 ✓、结清 ✓，四样都是现成的 ✓。

# method MakeSettleCallback:(table:HeapTable, promise:Value, rejected:bool)=>Value

**造一个「结清这个承诺」的宿主回调** ✓（第 285 轮 ✓）——执行器的两个形参就是它 ✓。

**两个号、一份实现** ✗：`resolve` 与 `reject` 只差**认哪一档** ✓，
所以它们落在号段里相邻的两个号上 ✓（240 = 兑现 ✓、241 = 拒绝 ✓）、
由 `InvokePromise` 分成两支 ✓——**写成两份实现就是两处会漂** ✗
（而漂的症状正是「`reject` 之后 `resolve` 又生效」✓，那是 JS 里**明令**不许的 ✓：
承诺结清一次就定死了 ✓）。

**「哪一个承诺」藏在宿主引用的 `Opaque` 那一格里** ✗：宿主引用值自己带着一个整数 ✓
（`CreateHostRef(号, 不透明值)` ✓）——于是**不必**给这一族再开一张表 ✓，
与 `bind` 造出来的那个通知对象同一个手法 ✓（`globals.xl.md` 的 `BoundCall` ✓）。

**`Opaque` 收的是句柄、不是值** ✓：`Value` 是「标签 + 下标」两格 ✓，
而 `Opaque` 只有一格 ✓——收句柄、用的时候现包一个值 ✓（见 `SettleOfCallback` ✓）。

**它还差一步（第 286 轮量清、下一轮做）** ✗：脚本里 `resolve` 是**当普通函数**调的 ✓
（`(resolve) => resolve(1)` ✓，**没有接收者** ✓），而这一族读的是
**接收者**那一格 ✓（`InvokePromise` 的 `self` ✓）——于是 `self` 是 `undefined` ✓，
宿主读 `self.Tag` 报 `Cannot read properties of undefined (reading 'Tag')` ✗，
那一抛被抬成脚本异常 ✓ ⇒ 这个新承诺被**拒绝** ✗ ⇒
宿主说「脚本挂着等一个它没结清的承诺」✓（**看起来像运行器卡住** ✗）。
**两条候选**（都试过、都差最后一步 ✗）：① 引擎那条 `InvokeCallback` 多收一格
**接收者** ✓（`invoke(executor, self, args)` ✓，本轮加了 ✓）——可 `resolve` 是**脚本自己**
调的 ✓，`self` 由**那条调用**决定 ✓，给执行器一个接收者**传不到它身上** ✗；
② 让 `MakeSettleCallback` 造一个**绑定过的**值 ✓（把承诺写进实参表第一格 ✓，
宿主分派那一支读 `args[0]` ✓）——这条路要用 `bind` 那条already有的机关 ✓，
是下一轮最短的一步 ✓。

```ts
return Value.FromRef(ValueTag.HostRef, table.CreateHostRef(
  rejected ? PromiseRejectCallbackId : PromiseResolveCallbackId, promise.Ref));
```

# method SettleOfCallback:(table:HeapTable, self:Value)=>Value

**从一个结清回调里读回它管的那个承诺** ✓（第 285 轮 ✓）。

**读不到就响亮地抛** ✗（不静默给 `undefined` ✓）：能走到这一支的
只可能是「语言层自己造的回调」✓——读不到就是**建库层或引擎的 bug** ✓，
不是脚本写错了 ✓（与 `get_index` 那条「形状不对就抛」同一条纪律 ✓）。

```ts
if (self.Tag !== ValueTag.HostRef) {
  throw new Error("unimplemented: a promise settle callback needs its host reference");
}
const payload = table.Get(self.Ref).Host;
if (payload === null) throw new Error("unimplemented: a promise settle callback without a payload");
return Value.FromObject(payload.Opaque);
```

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
SetProperty(room, NeverCall, table, promise, NameValue(table, "finally"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseFinally, 0)));
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

# method InvokePromise:(room:RoomChecker, table:HeapTable, protos:Protos, id:int, self:Value, args:Array<Value>, schedule:TaskScheduler | null, settle:TaskSettler | null, invoke:InvokeCallback | null, takeThrown:ThrownTaker | null)=>Value

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
// **第 295 轮那四步** ✓（`allSettled` 两档 ✓、`any` 两档 ✓）：同一处收口 ✓——
// 它们的形状与上面两步一字不差 ✓（引擎回调到这儿 ✓），差的只是**收到值之后干什么** ✓。
// `mode` 就是「哪一个号」✓：`0/1` = `allSettled` 的兑现/拒绝 ✓、`2/3` = `any` 的兑现/拒绝 ✓。
if (id === PromiseSettledStepId) return PromiseCollectStep(room, table, protos, 0, args, settle);
if (id === PromiseRejectedStepId) return PromiseCollectStep(room, table, protos, 1, args, settle);
if (id === PromiseAnyStepId) return PromiseCollectStep(room, table, protos, 2, args, settle);
if (id === PromiseAnyRejectStepId) return PromiseCollectStep(room, table, protos, 3, args, settle);
// **执行器递出去的那两个也要接住** ✓（第 285 轮 ✓）：它们与上面那两步**同一条形状** ✓
// ——语言层自己造的宿主回调 ✓，回到这个分派 ✓。
// **「哪一个承诺」在 `self` 里** ✓：`MakeSettleCallback` 把它写进了宿主引用的 `Opaque` ✓
// ——**不是**实参 ✓（脚本调 `resolve(5)` 时那一个实参是**兑现值** ✓）。
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
if (id === PromiseResolve) {
  const value = args.length > 0 ? args[0] : Value.Undefined();
  return MakePromise(room, table, PromiseState.Fulfilled, value);
}
if (id === PromiseReject) {
  const value = args.length > 0 ? args[0] : Value.Undefined();
  return MakePromise(room, table, PromiseState.Rejected, value);
}
if (id === PromiseWithResolvers) {
  // **`Promise.withResolvers()`** ✓（第 327 轮 ✓）——三样一起交出去 ✓：
  // 一个**待结清**的承诺 ✓（`MakePromise` 顺手把三个方法挂上 ✓）、
  // 一对结清回调 ✓（`MakeSettleCallback` ✓，第 285 轮那一对 ✓）。
  //
  // **房间先问齐** ✓（与 `MakePromise` / 这一层别处同一条纪律 ✓）：
  // 一个普通对象 ✓ + 三格值 ✓——**问到一半才失败**的话，前面造出来的东西
  // 已经挂在那儿了 ✓（这一层没有「回滚」✗）。
  if (!room(ObjectCharge * 2 + ValueCharge * 3)) throw new Error("out of room");
  const pendingPromise = MakePromise(room, table, PromiseState.Pending, Value.Undefined());
  const resolvers = NewPlainObject(room, table, protos);
  SetNumberProp(room, table, resolvers, "promise", pendingPromise);
  SetNumberProp(room, table, resolvers, "resolve", MakeSettleCallback(table, pendingPromise, false));
  SetNumberProp(room, table, resolvers, "reject", MakeSettleCallback(table, pendingPromise, true));
  return resolvers;
}
// **`Promise.try(回调, …实参)`** ✓（第 331 轮 ✓，ES2025 ✓）——
// **同步调一次那个回调** ✓，把「返回了什么 / 抛了什么」收成**一个承诺** ✓。
//
// **它不是 `Promise.resolve(回调())`** ✗：那样写有两个错 ✓——
// 回调是**当场跑**的 ✓（这一条两边一样 ✓），可 `Promise.resolve(…)` 在 `f` **抛**时
// 会把**整段代码**打断 ✗，而 `Promise.try` 要的是**把它变成一份拒绝** ✓
//（调用者那一句照样跑完 ✓，与 `new Promise(执行器)` 那一支**同一条口径** ✓）。
//
// **它不是 `new Promise(r => r(f()))`** ✗：形状对得上 ✓，但多绕一层 ✓、
// 还多挂两个结清回调 ✓——零件全是现成的 ✓（`MakePromise` ✓ / `invoke` ✓ /
// `takeThrown` ✓ / `settle` ✓），一个字的特例都不用加 ✓。
//
// **兑现那一格会自动采纳承诺** ✓（`settle` 走 `ResolvePromise` ✓，第 317 轮 ✓）——
// 所以 `Promise.try(async () => 1)` 给的是**那个内层承诺的结果** ✓，不是承诺套承诺 ✗。
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
  // **其余实参原样转给回调** ✓（JS 的 `Promise.try(f, a, b)` 就是 `f(a, b)` ✓）——
  // 从第 1 格起切 ✓（第 0 格是回调自己 ✓）。
  const rest: Value[] = [];
  for (let i = 1; i < args.length; i++) rest.push(args[i]);
  const produced = MakePromise(room, table, PromiseState.Pending, Value.Undefined());
  // **接收者给 `undefined`** ✓：JS 里 `Promise.try(f)` 的 `f` 是**普通调用** ✓
  //（松散模式下 `this` 是全局对象 ✓，本仓一律给 `undefined` ✓——与整仓同一条口径 ✓）。
  // **同步返回也要走 `settle`** ✓（不是「已经兑现的承诺」那一条捷径 ✗）：
  // 语义上它照样要让出一个 tick ✓，而两条路在这里**合流** ✓——
  // 引擎那一侧 `settle` 会把等着它的帧排进微任务 ✓。
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
  // **要收值的那两条各收各的** ✓（第 295 轮把 `allSettled` / `any` 接上 ✓）：
  // `all` / `allSettled` 收**结果**（按输入下标 ✓）、`any` 收**拒绝原因** ✓。
  const collects = id === PromiseAll || id === PromiseAllSettled;
  if (collects || id === PromiseAny) {
    const box = NewPlainArray(room, table, protos);
    for (let i = 0; i < count; i++) {
      if (!room(ValueCharge)) throw new Error("out of room");
      table.Get(box.Ref).AsArray().Push(Value.Undefined());
    }
    SetNumberProp(room, table, state, collects ? "values" : "errors", box);
  }
  // **空数组那一档** ✓（JS 的口径 ✓）：`all([])` 兑现成 `[]` ✓、`allSettled([])` 也是 `[]` ✓、
  // **`any([])` 拒绝成 `AggregateError`** ✓（一条都没兑现、也没有原因 ✓）、
  // **`race([])` 永不结清** ✓。
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
  // **四个静态方法各挑各的兑现步** ✗（第 295 轮实测踩过 ✓）：
  // 第一版把 `any` 也指到 `PromiseSettledStepId` ✓——那一步往 `state.values` 里写记录 ✓，
  // 而 `any` 造的是 `state.errors` ✓ ⇒ 那一格**根本不存在** ✗ ⇒ 最后一个到齐时
  // `settle(result, ReadProp(state, "values"), false)` 把 **`undefined`** 兑现出去 ✓
  //（**静默错值** ✓：`Promise.any([Promise.resolve(3)])` 打出 `a undefined` ✓，
  //  而 `allSettled` 一字不差是对的 ✓——**一半对一半错**最难查 ✓）。
  const step = id === PromiseAll ? PromiseAllStepId
    : (id === PromiseRace ? PromiseRaceStepId
      : (id === PromiseAllSettled ? PromiseSettledStepId : PromiseAnyStepId));
  const stepValue = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(step, 0));
  // **第 295 轮那两条要两个回调** ✓（`wants = 3` ✓，与 `.then(f, g)` 同一格 ✓）：
  // 「兑现」与「拒绝」各一个号 ✓——引擎只把结清值接在实参后面 ✓，
  // **不告诉回调这是哪一档** ✗（理由写在 `PromiseRejectedStepId` 那一段 ✓）。
  const rejectStep = id === PromiseAllSettled ? PromiseRejectedStepId
    : (id === PromiseAny ? PromiseAnyRejectStepId : 0);
  const rejectStepValue = rejectStep === 0
    ? Value.Undefined()
    : Value.FromRef(ValueTag.HostRef, table.CreateHostRef(rejectStep, 0));
  for (let i = 0; i < count; i++) {
    const item = table.Get(source.Ref).AsArray().GetAt(i);
    // **不是承诺的项要当「已经兑现为它自己」** ✓（第 247 轮 ✓）——
    // JS 的 `Promise.all` 对每一项都先做一次 `Promise.resolve` ✓：
    // `Promise.all([1, Promise.resolve(2), "3"])` 给 `[1, 2, 3]` ✓。
    //
    // **原来直接把它交给调度器** ✗：调度器只认承诺 ✓（它的工作是「挂在那个承诺的反应表上」✓），
    // 拿一个**数字**去挂，那一格**永远不会有反应被触发** ✓——
    // 于是那一步的 `remaining` **永远减不到 0** ✗、结果承诺**永不结清** ✓。
    // **实测的现场**（判据 `promise-all-kinds` / `prm-combinators` ✓）：
    // `Promise.all([1, Promise.resolve(2), "3"])` 打出 `mixed ,2,` ✓
    //（第 1、3 项是**空串** ✓——那两格从来没被写过 ✓），而 Node 给 `mixed 1,2,3` ✓。
    // **它不报错** ✗ ⇒ **静默错值** ✓，正是最该先修的那一类 ✓
    //（第 244 轮量出的「引擎抛的错要能进脚本的错路」那一族修完之后，这两条就露出来了 ✓）。
    //
    // **为什么不「直接调一步」** ✗：那样 `all` 与 `race` 两条路要各写一遍 ✓、
    // 而且「同步调一步」与「承诺结清后调一步」的**次序**会不同 ✓（JS 里两者都走微任务 ✓）。
    // **包一个已兑现的承诺**是最短的一条 ✓——形状与 `PromiseResolve` 那一支**一字不差** ✓。
    const one = IsPromise(table, item)
      ? item
      : MakePromise(room, table, PromiseState.Fulfilled, item);
    // **`all` 只认兑现那一档** ✓（某一步被拒绝时**回调不跑** ✓、
    // 拒绝顺着「结果承诺」自动传下去 ✓——那正是 JS 的语义 ✓）；
    // **`race` 两档都认** ✓（谁先结清谁定 ✓）；
    // **`allSettled` / `any` 两档都收、但收到的东西不同** ✓（第 295 轮 ✓）
    // ——所以它们走 `wants = 3`（两个回调 ✓），而 `all` / `race` 走 0 / 2 ✓。
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
  const result = MakePromise(room, table, PromiseState.Pending, Value.Undefined());
  // **认哪一档** ✓：`then(f)` 只认兑现 ✓、`catch(g)` 只认拒绝 ✓、
  // `then(f, g)` **两档各一个** ✓（第 187 轮 ✓——`wants = 3` ✓，引擎按结清的那一档挑 ✓）。
  const wants = id === PromiseCatch ? 1 : (args.length > 1 ? 3 : 0);
  const onRejected = args.length > 1 ? args[1] : Value.Undefined();
  schedule(self, callback, [], result, wants, true, onRejected);
  return result;
}
if (id === PromiseFinally) {
  // **`.finally(cb)`** ✓（第 187 轮 ✓）：两档都调 ✓、然后**把源那一档原样传下去** ✓
  // ——回调的返回值**不算数** ✓（`wants = 4` ✓，引擎里那一支管着 ✓）。
  if (schedule === null) {
    throw new Error("unimplemented: Promise.prototype.finally needs the task channel (the host did not provide it)");
  }
  if (!IsPromise(table, self)) {
    throw new Error("unimplemented: .finally needs a promise receiver");
  }
  const callback = args.length > 0 ? args[0] : Value.Undefined();
  const result = MakePromise(room, table, PromiseState.Pending, Value.Undefined());
  schedule(self, callback, [], result, 4, false, Value.Undefined());
  return result;
}
if (id === PromiseCtor) {
  // **`new Promise(执行器)`** ✓（第 285 轮 ✓）：执行器要**同步跑一次** ✓
  //（JS 的口径 ✓：`new Promise((r) => { console.log("x"); r(1) })` 在**这一句**里印 `x` ✓），
  // 拿到两个**结清回调** ✓——`(resolve, reject)` ✓。
  //
  // **执行器自己抛 ⇒ 结果承诺被拒绝** ✓（JS 的口径 ✓）：那一抛不能变成宿主错误 ✗
  //（`new Promise(() => { throw new Error("x") }).catch(e => …)` 在 Node 里接得住 ✓）。
  // 判据是引擎给的 `TakeThrown` ✓（见 `vm.xl.md` ✓）——**不是**一个宿主 `try` ✗：
  // 脚本异常在本仓里**不是**宿主异常 ✓（它从 `CallNative` 里出来时状态已经变了 ✓，
  // 值留在 `Pending` 里 ✓）——用宿主 `try` 接只会接到引擎内部的 bug ✓。
  //
  // **没有执行器 ⇒ 一个永远等着的承诺** ✓（`new Promise()` 在 JS 里是 `TypeError` ✓，
  // 而那一条**响亮的报**留给判据 ✓——引擎这一格不替它决定 ✓）。
  //
  // **没接通道就响亮地抛** ✗（与 `.then` 那几支同一条纪律 ✓）：
  // 静默给一个永远不结清的承诺是最难查的一种 ✓。
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
    const result = MakePromise(room, table, PromiseState.Pending, Value.Undefined());
    const onFulfilled = MakeSettleCallback(table, result, false);
    const onRejected = MakeSettleCallback(table, result, true);
    const executor = args[0];
    const pair: Value[] = [];
    pair.push(onFulfilled);
    pair.push(onRejected);
    // **执行器按方法调**（`invoke` 是引擎那条「同步调一个脚本值」的通道 ✓）：
    // 接收者给**那个承诺本身** ✓、实参是 `(resolve, reject)` ✓。
    //
    // **接收者还没解决问题** ✗（第 286 轮量清 ✓）：脚本里 `resolve` 是**自己当普通函数**
    // 调的 ✓（`(resolve) => resolve(1)` ✓），所以执行器有接收者**传不到 `resolve` 身上** ✗
    // ——真相写在 `MakeSettleCallback` 那一段（两条候选与下一轮最短的一步 ✓）。
    invoke(executor, result, pair);
    // **执行器抛出来的那一抛：把结果拒绝掉** ✓（`takeThrown` 取走即清 ✓，
    // 顺手把状态放回去 ✓——外层那一段脚本还要接着跑 ✓）。
    const thrown = takeThrown();
    if (thrown.Tag !== ValueTag.Undefined) {
      settle(result, thrown, true);
    }
    return result;
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

# method NewAggregateError:(room:RoomChecker, table:HeapTable, protos:Protos, errors:Value, message:string)=>Value

**造一个 `AggregateError`**（第 295 轮 ✓）——`Promise.any` 全部被拒绝时抛的就是它 ✓。

**为什么这里自己造、不转调 `globals.xl.md` 的 `NewErrorLike`** ✗：依赖方向是
**`globals` → `promise`** ✓（`globals.xl.md` 要 import `BuildPromise` ✓）——
反过来 import 就是**环形依赖** ✓。而这一段只有四行 ✓（造对象 ✓、接原型 ✓、
`message` / `name` 两个不可枚举的格 ✓、`errors` 一格 ✓），抄一份的代价比造环小 ✓。
**四行与 `NewErrorLike` 的差别只有 `errors` 那一格** ✓（它**是可枚举的** ✗——
JS 里 `AggregateError.prototype.errors` 是自有属性 ✓、`message` / `name` 在原型上 ✓；
本仓两者都挂自有 ✓，那一条差异记在台账里 ✓）。

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

**`allSettled` / `any` 的那一步**（第 295 轮 ✓）——四种情形共用一个方法 ✓，
`mode` 就是「哪一个号」✓：`0` = `allSettled` 的兑现 ✓、`1` = `allSettled` 的拒绝 ✓、
`2` = `any` 的兑现 ✓、`3` = `any` 的拒绝 ✓。

**收值的形状** ✓：`allSettled` 按**下标**放进 `values` ✓
（JS 的顺序是**输入顺序** ✓，不是结清顺序 ✓）——与 `PromiseAllStep` 同一条规矩 ✓；
`any` 把拒绝原因按下标放进 `errors` ✓（**全部被拒绝**时那个 `AggregateError` 要按顺序装 ✓）。

**`any` 的兑现当场定胜负** ✓（第一个兑现的就是答案 ✓）：幂等交给引擎 ✓
（`ResolvePromise` 自己判 `Pending` ✓，与 `PromiseRaceStep` 一字不差 ✓）。

**`allSettled` 永远兑现** ✓：两档都往 `values` 里写一格 ✓，最后一个到齐才结清 ✓
——**拒绝那一条也走同一个出口** ✓（这正是它与 `all` 的唯一区别 ✗）。

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
  // **`allSettled` 的那个记录** ✓：`{ status, value }` / `{ status, reason }` ✓——
  // **先问 room、再分配** ✗（与 `Promise.all` 那段同一个理由 ✓：
  // 下面那两句 `SetProperty` 自己也会问 room ✓，触发回收时它还没有人指着 ✓）。
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
// **第 295 轮补的两格** ✓（`allSettled` / `any` ✓）——与上面四个**同一张对象**上再挂 ✓。
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "allSettled"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseAllSettled, 0)));
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "any"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseAny, 0)));
// **第 327 轮补的一格** ✓（`withResolvers` ✓）——与上面六个**同一张对象**上再挂 ✓
//（名字与号**一一对齐** ✓：`PromiseWithResolvers = 248` ✓，而 `248` 正是这一段的下一格 ✓）。
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "withResolvers"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseWithResolvers, 0)));
// **第 331 轮补的一格** ✓（`try` ✓）——与上面七个**同一张对象**上再挂 ✓。
// **它是「同步跑、异步收」那一格** ✓：回调当场跑 ✓，而结果承诺照样让出一个 tick ✓。
SetProperty(room, NeverCall, table, promiseObject, NameValue(table, "try"),
  Value.FromRef(ValueTag.HostRef, table.CreateHostRef(PromiseTry, 0)));
return promiseObject;
```
