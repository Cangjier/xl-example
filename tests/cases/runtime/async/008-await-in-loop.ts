// xl:title 循环里顺序 `await`：每一轮一个新微任务
// xl:round 304
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 2 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/010-async-loop-sequential.ts
//   · runtime/async/048-async-await-in-loop.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/010-async-loop-sequential.ts ——
  (function () {
  const delay = (v: number) => Promise.resolve(v);
  async function run() {
    let total = 0;
    for (const n of [1, 2, 3]) total += await delay(n);
    return total;
  }
  run().then((t) => console.log("total", t));
  console.log("started");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/048-async-await-in-loop.ts ——
  (function () {
  async function f(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await null;
      console.log("i", i);
    }
    console.log("done");
  }
  f();
  console.log("sync");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
