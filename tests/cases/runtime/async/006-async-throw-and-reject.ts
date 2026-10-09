// xl:title `async` 里的抛错与拒绝：`throw` / 执行器里抛 / `await` 一个被拒的承诺
// xl:round 331
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 4 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/006-prm-async-throw.ts
//   · runtime/async/024-promise-executor-throw-and-sync.ts
//   · runtime/async/027-async-error-paths.ts
//   · runtime/async/047-async-throw-catch.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/006-prm-async-throw.ts ——
  (function () {
  async function boom(): Promise<number> { throw new Error("async-fail"); }
  boom().catch((e: any) => console.log("caught", e.message));
  async function tryInside(): Promise<string> {
    try { await boom(); return "unreachable"; } catch (e: any) { return "handled:" + e.message; }
  }
  tryInside().then((v: string) => console.log(v));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/024-promise-executor-throw-and-sync.ts ——
  (function () {
  const log: string[] = [];
  new Promise(() => {
    log.push("exec");
    throw new Error("x");
  }).catch((e) => log.push("catch:" + (e as Error).message));
  log.push("sync");
  Promise.resolve().then(() => {
    log.push("micro");
    console.log(log.join(","));
  });
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/027-async-error-paths.ts ——
  (function () {
  async function boom(): Promise<void> { throw new Error("boom"); }
  async function reject(): Promise<void> { await Promise.reject(new Error("rej")); }
  async function guarded(): Promise<string> {
    try { await boom(); return "no"; } catch (e) { return "caught:" + (e as Error).message; } finally { console.log("fin"); }
  }
  boom().catch((e) => console.log("1", (e as Error).message));
  reject().catch((e) => console.log("2", (e as Error).message));
  guarded().then((v) => console.log("3", v));
  (async () => { try { await Promise.reject("raw"); } catch (e) { console.log("4", e); } })();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/047-async-throw-catch.ts ——
  (function () {
  async function f(): Promise<void> {
    try {
      await Promise.reject(new RangeError("bad"));
    } catch (e: any) {
      console.log("caught", e.name, e.message);
    }
    console.log("after");
  }
  f();
  console.log("sync");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
