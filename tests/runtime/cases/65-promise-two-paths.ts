// 第 187 轮：**`.then(f, g)` 两条路** + `.finally`。
//
// 上一轮的 `.then(f)` 只认兑现那一档（拒绝原样传下去），`.catch(g)` 只认拒绝那一档。
// 这一轮补上 JS 的**两个实参**形式：**一步两条路**——兑现时调 `f`、拒绝时调 `g`。
//
// **为什么不是「挂两步」**：挂两步（一步只认兑现、一步只认拒绝）会**互相踩**——
// 拒绝到来时，那一步「只认兑现」的回调虽然不跑，但它的**传播**会先把结果承诺拒绝掉，
// 接着 `g` 去兑现同一个承诺就是**空操作**（结果停在「拒绝」上，而 JS 要的是 `g` 的返回值）。
// 所以引擎那一格多了一个 `OnRejected`，按结清的那一档挑一个调。
//
// **`.finally(cb)`** 是第三种形状：两档都调、然后**把源那一档原样传下去**——
// 回调的返回值**不算数**（引擎里的 `wants = 4`）。
//
// **两条今天还红的形状写在明处**（都不进这份语料）：
// ① **`.finally(...)` 后面再接一个调用**（`.finally(cb).then(cb2)` / `.finally(cb).catch(cb2)`）——
//    token 层把 `finally` 认成**关键字**（`<Keyword>finally</Keyword>`，不是方法名），
//    于是链上那一步读错了属性；**单独一句 `.finally(cb);` 是好的**（这一轮量准）；
// ② **拒绝源上的 `.then(f, g)` 再往下接一个 `.then`** —— 回调跑了、结果承诺也结清了，
//    但下一步没被排进微任务（这一轮量到，还没查清；记在台账里）。

// ① 两条路：兑现走 f、拒绝走 g
Promise.resolve(1).then((v: any) => console.log("ok", v), (e: any) => console.log("no", e));
Promise.reject("bad").then((v: any) => console.log("no1", v), (e: any) => console.log("handled", e));

// ② 兑现那一档的 `g` 不会被调；`f` 的返回值灌进下一步
Promise.resolve(5).then((v: any) => v * 2, (e: any) => 0).then((v: any) => console.log("two-path", v));

// ③ 没给 `g`（或者给的不是函数）：拒绝**原样传下去**（JS 的口径）
Promise.reject("bad2").then((v: any) => "x").catch((e: any) => console.log("caught", e));

// ④ `.finally`：单独一句（链式那一格是 token 层的旧账，见文首）
Promise.resolve("fin").finally(() => console.log("cleanup"));

console.log("done");
