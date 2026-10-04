// 第 188 轮：**接住了拒绝，结果就是兑现**。
//
// 上一轮量到一条**静默**的错：`Promise.reject("e").then(f, g).then(cb)` 里，
// `g` 跑了、结果承诺也结清了，但**下一步一句都不跑**（不报错）。
//
// 根因在引擎那一格：回调跑完之后，结果的档跟着**源**那一档走——
// 源是「拒绝」，于是结果**还是被拒绝**。而 JS 的口径是
// **「谁接住了这一档，结果就是兑现」**（兑现值就是那个回调的返回值）。
// 「结果跟着拒绝」只在**没人接**的时候发生——那一条走的是另一支。
//
// **同一轮把另一条形状量准了**（写在明处，也不进这份语料）：
// **方法名是关键字、后面还接着一个调用**时，链上那一步读错属性——
// `.catch(cb).then(cb2)` 与 `.finally(cb).then(cb2)` 都是（`catch` / `finally` 是关键字，
// 而 `then` 不是）。**中间落一个变量就好了**：`const p = X.catch(cb); p.then(cb2);`
// （下面第 ③ 组就是这么写的）。这一格属于**降级/链**那一侧，单独立一轮。

// ① `then(f, g)` 接住拒绝之后，后面那一步照跑（这一轮修的就是它）
Promise.reject("e2")
  .then((v: any) => 0, (e: any) => "recovered " + e)
  .then((v: any) => console.log("recovered", v));

// ② 没人接：拒绝原样传下去（这一条一直是好的）
Promise.reject("bare")
  .then((v: any) => console.log("won't run", v))
  .catch((e: any) => console.log("still rejected", e));

// ③ `catch` 接住之后，结果也是**兑现**（中间落一个变量，绕开上面那条链的旧账）
const handled = Promise.reject("boom").catch((e: any) => "handled " + e);
handled.then((v: any) => console.log("after-catch", v));

// ④ 接住之后再接一个 `catch`：那个 `catch` **不该跑**
const twice = Promise.reject("x").catch((e: any) => "ok " + e);
twice.catch((e: any) => console.log("should not print", e));
twice.then((v: any) => console.log("final", v));

// ⑤ 兑现值本身还是那个回调的返回值（链式照旧）
Promise.resolve(3)
  .then((v: any) => v + 1)
  .then((v: any) => console.log("chain", v));

console.log("done");
