// xl:title `await` 一个被拒承诺的三条路：`catch` 体里 / 循环里 / 手动 `try`
// xl:round 305
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 3 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/018-await-inside-catch.ts
//   · runtime/async/022-async-await-reject-in-try.ts
//   · runtime/async/023-promise-reject-after-await.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/018-await-inside-catch.ts ——
  (function () {
  async function f() {
    try {
      throw new Error("x");
    } catch (e) {
      const m = await Promise.resolve((e as Error).message);
      console.log("caught", m);
    }
  }
  f();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/022-async-await-reject-in-try.ts ——
  (function () {
  async function f(n: number): Promise<number> {
    await null;
    if (n === 2) throw new Error("boom");
    return n * 10;
  }
  async function run(): Promise<void> {
    const out: number[] = [];
    for (const n of [1, 2, 3]) {
      try {
        out.push(await f(n));
      } catch (e) {
        out.push(-1);
      }
    }
    console.log(out.join(","));
    const caught = await f(2).catch((e) => "caught:" + (e as Error).message);
    console.log(caught);
  }
  run();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/023-promise-reject-after-await.ts ——
  (function () {
  async function f(n: number): Promise<number> {
    await null;
    if (n === 2) throw new Error("boom");
    return n;
  }
  async function run(): Promise<void> {
    for (const n of [1, 2, 3]) {
      const got = await f(n).then((v) => "ok" + v).catch((e) => "err" + (e as Error).message);
      console.log(got);
    }
    const caught = await (async () => {
      try {
        await f(2);
        return "no-throw";
      } catch (e) {
        return "caught:" + (e as Error).message;
      }
    })();
    console.log(caught);
  }
  run();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
