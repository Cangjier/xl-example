// xl:title `await` 落在 `try` / `finally` 里：收尾次序与 `finally` 里的 `return`
// xl:round 304
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 4 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/011-await-in-try-finally.ts
//   · runtime/async/021-async-await-try-finally.ts
//   · runtime/async/046-async-try-finally.ts
//   · runtime/async/049-async-finally-return-order.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/011-await-in-try-finally.ts ——
  (function () {
  async function run() {
    try {
      console.log("try", await Promise.resolve("a"));
      return "from-try";
    } finally {
      console.log("finally", await Promise.resolve("b"));
    }
  }
  run().then((v) => console.log("result", v));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/021-async-await-try-finally.ts ——
  (function () {
  async function run(): Promise<void> {
    const log: string[] = [];
    try {
      log.push("try");
      await null;
      throw new Error("x");
    } catch (e) {
      log.push("catch");
    } finally {
      log.push("finally");
    }
    log.push("after");
    console.log(log.join(","));
  }
  run();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/046-async-try-finally.ts ——
  (function () {
  async function f(): Promise<number> {
    try {
      await null;
      console.log("try");
      return 1;
    } finally {
      console.log("finally");
    }
  }
  f().then((v: number) => console.log("v", v));
  console.log("sync");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/049-async-finally-return-order.ts ——
  (function () {
  async function f(): Promise<number> {
    try { return 1; } finally { console.log("fin"); }
  }
  async function g(): Promise<number> {
    try { return 1; } finally { return 2; }
  }
  f().then((v: number) => console.log("f", v));
  g().then((v: number) => console.log("g", v));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
