// xl:title `async` 函数：同步段、`await` 的次序与返回值的形状
// xl:round 9
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 3 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/005-prm-async-await.ts
//   · runtime/async/034-async-return-await-order.ts
//   · runtime/async/042-async-return-value.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/005-prm-async-await.ts ——
  (function () {
  async function f(): Promise<number> {
    const a = await Promise.resolve(1);
    const b = await 2;
    return a + b;
  }
  f().then((v: number) => console.log("sum", v));
  async function g(): Promise<void> {
    console.log("g-start");
    const v = await Promise.resolve("x");
    console.log("g-got", v);
  }
  g();
  console.log("after-call");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/034-async-return-await-order.ts ——
  (function () {
  const log: string[] = [];
  async function a() { log.push("a1"); await null; log.push("a2"); return "A"; }
  async function b() { log.push("b1"); const r = await a(); log.push("b2:" + r); return "B"; }
  b().then((v) => { log.push("then:" + v); console.log(log.join(" ")); });
  log.push("sync");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/042-async-return-value.ts ——
  (function () {
  async function f(x: number): Promise<number> { return x + 1; }
  f(1).then((v: number) => console.log("v", v));
  console.log(typeof f(1).then);
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
