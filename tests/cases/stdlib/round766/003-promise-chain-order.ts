// xl:title `Promise` 链的次序与返回值：`then` / `catch` / `finally`
// xl:round 766
// xl:judge stdout
// xl:note 一条链上把四种收尾都走一遍：`then` 的返回值往下传、`catch` 能把链**接回来**、
// xl:note `finally` **不吃值**（它给的还是上游那一份）、以及执行器里
// xl:note `resolve` 之后再抛**不算数**（那一抛被丢掉，承诺已经结清了）。
// xl:note 打印的是**次序**，所以它同时钉住「微任务什么时候跑」这一格。
// xl:note **这一条故意不混进「`.finally` 的链与另一条链谁先」那一格**：那一格
// xl:note 本仓与 Node 差一跳（规范里 `finally` 还要多走一次 thenable 采纳），
// xl:note 已按规矩登在 `stdlib/round766/r766a-07`（见根 README 第 766 轮）。
// xl:end
Promise.resolve(1)
  .then((v) => { console.log("01", v); return v + 1; })
  .then((v) => { console.log("02", v); throw new Error("boom"); })
  .catch((e) => { console.log("03", e.message); return "recovered"; })
  .finally(() => console.log("04 fin"))
  .then((v) => console.log("05", v));
new Promise<number>((resolve) => { resolve(1); throw new Error("late"); })
  .then((v) => console.log("06", v), (e) => console.log("07", e.message));
new Promise((_resolve, reject) => { reject(new Error("now")); })
  .catch((e) => console.log("08", e.message));
console.log("done");
