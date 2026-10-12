// xl:title 承诺的接住与收尾：`catch` 之后回到兑现、`finally` 不改值也不吞拒绝
// xl:round 305
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 3 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/002-prm-catch.ts
//   · runtime/async/003-prm-finally.ts
//   · runtime/async/017-promise-finally-passthrough.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/002-prm-catch.ts ——
  (function () {
  Promise.reject(new Error("nope"))
    .catch((e: any) => "recovered:" + e.message)
    .then((v: any) => console.log(v));
  Promise.resolve("ok").then((v: any) => console.log("fine", v));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/003-prm-finally.ts ——
  (function () {
  Promise.resolve("v").finally(() => console.log("cleanup-1")).then((v: any) => console.log("got", v));
  Promise.reject("bad").finally(() => console.log("cleanup-2")).catch((e: any) => console.log("caught", e));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/017-promise-finally-passthrough.ts ——
  (function () {
  Promise.resolve(5).finally(() => console.log("fin")).then((v) => console.log("v", v));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
