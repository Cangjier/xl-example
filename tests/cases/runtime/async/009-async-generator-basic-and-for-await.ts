// xl:title `async` 生成器：`yield` 的值与 `for await` 的收尾
// xl:round 9
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 2 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/013-async-generator-basic-r305.ts
//   · runtime/async/035-async-generator-basic-r9.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/013-async-generator-basic-r305.ts ——
  (function () {
  async function* g(): AsyncGenerator<number> { yield 1; yield 2; }
  async function main() {
    const out: number[] = [];
    for await (const v of g()) out.push(v);
    console.log("agen", out.join(","));
  }
  main();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/035-async-generator-basic-r9.ts ——
  (function () {
  async function* gen() { yield 1; yield 2; yield 3; }
  async function main() {
    let sum = 0;
    for await (const v of gen()) sum += v;
    console.log("sum", sum);
    const all = [];
    for await (const v of gen()) all.push(v * 2);
    console.log(all.join(","));
  }
  main();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
