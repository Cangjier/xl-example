// 第 185 轮：`Promise`（`resolve` / `reject` / `.then` / `.catch`）
//
// 引擎那一侧**早就有承诺**：状态 + 兑现值 + 等着它的帧、微任务队列、`await` 的挂起与恢复。
// 缺的是**语言层那一格**：`Promise` 不是全局名，承诺上没有 `.then`。
//
// 这一轮补上，而且**推迟那一半交给引擎**：`call` 是同步重入，做不出「推迟一个微任务」，
// 所以语言层只说「源承诺、回调、实参、结果承诺、认哪一档、返回值要不要灌进去」，
// 由执行器去排、去调。
//
// **行序与 Node 一致**是这一轮真正的判据：`a` / `b` / `c` 三行先出来，
// 回调排在它们后面；两个 `.then` 之间按**挂上的先后**（同一条队列）。

console.log("a");
Promise.resolve(1).then((v: any) => console.log("then", v));
console.log("b");
Promise.reject(new Error("nope")).catch((e: any) => console.log("caught", e.message));
console.log("c");

// 链式：上一步的返回值灌进下一步
Promise.resolve(7).then((v: any) => v + 1).then((v: any) => console.log("chain", v));

// 不是承诺也照样推迟（`resolve` 出来的那一档同样走微任务）
let order = "";
Promise.resolve("p").then((v: any) => { order += v; });
order += "sync";
Promise.resolve(0).then(() => console.log("order", order));

// 拒绝那一档：`then` 的回调**不跑**，`catch` 跑
Promise.resolve(1).then((v: any) => console.log("won't print", v));
Promise.reject("boom").then((v: any) => console.log("skipped", v)).catch((e: any) => console.log("caught2", e));

// 引擎结清一个承诺时，回调拿到的是**兑现值**（不是承诺）
const settled = Promise.resolve("done");
settled.then((v: any) => console.log("value", v, typeof v));
