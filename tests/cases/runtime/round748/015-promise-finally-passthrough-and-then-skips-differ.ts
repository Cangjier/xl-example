// xl:title 承诺：`finally` 的透传与 `then` 返回新承诺
// xl:round 748
// xl:judge stdout
// xl:want differ
// xl:why `.then(undefined)` 要**跳过回调、把源那一档原样传下去**（规范 `PerformPromiseThen`：
// xl:why `onFulfilled` 不是 callable 就换成 `Identity` / `Thrower`）——Node 给 `skip`
// xl:why （后面那一跳 `.then` 收到 **`1`**），本仓给 `skip undefined`（收到 `undefined`），
// xl:why `.then(5 as any)` / `.then({})` 同样给 `undefined`。
// xl:why **这一轮量到底的那一层**：不是「有没有传」，而是**结清值到不了任务上**——
// xl:why `.then(f)` 挂在一个**已经结清**的承诺上时，`ScheduleTask` 走「已经结清」那一支
// xl:why （`vm.xl.md`），把值接进 `args`；可队列里那一格**可能当轮就被跑掉**
// xl:why （`DrainMicrotasks` 在宿主边界上跑），随后**同一个槽被下一个任务复用**
// xl:why （`FindFreeTask` 的判据是 `Callback` 不是引用）⇒ 那一次的结清值**跟着被冲掉**。
// xl:why 实测到的读数：跑 `.then(5)` 那一格时 `args` 是**空的**。
// xl:why **试过两版、都退回来了**：① 在 `IsRef` 那一句旁边分流 `undefined`（`tsc` 报
// xl:why `carried` 用在声明之前）；② 给 `NativeTask` 添一格 `Settled`、把它与 `Args`
// xl:why 分开（`ResolvePromise` / `ScheduleTask` / `RunNativeTask` 三处同改）——
// xl:why 第二版连 `Promise.resolve(1).then(undefined)` 那一格都没通（`settledValue` 仍是
// xl:why `null`，说明**那一支的结清根本没有走到 `ResolvePromise`**），
// xl:why 为了不在这一轮把 `Promise` 那一族带崩，**两版都按原样退回**（工作树里没有它们的痕迹）。
// xl:why 下一步是把 `ScheduleTask` 已经结清那一支与 `DrainMicrotasks` 的**交错**量清楚。
// xl:end
// 本文件是 `p748a-a16` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const p = Promise.resolve(1);
const q = p.then((v) => v + 1);
console.log(p === q, typeof q.then);
q.then((v) => console.log("q", v));
p.finally(() => "ignored").then((v) => console.log("finally passthrough", v));
Promise.reject("e").finally(() => console.log("cleanup")).catch((e) => console.log("after finally", e));
Promise.resolve(1).then(undefined, () => console.log("not called")).then((v) => console.log("skip", v));
console.log("sync");
