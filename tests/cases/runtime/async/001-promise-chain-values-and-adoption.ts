// xl:title 承诺链：值的逐级透传、`then` 返回承诺的展开、兑现值是承诺时的采纳与拒绝传播
// xl:round 7
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 7 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/001-prm-then-chain.ts
//   · runtime/async/009-promise-then-returns-promise.ts
//   · runtime/async/012-async-return-adopts-promise.ts
//   · runtime/async/019-promise-adoption-chain-r317.ts
//   · runtime/async/025-promise-chaining-values.ts
//   · runtime/async/032-promise-adoption-chain-r7.ts
//   · runtime/async/045-promise-then-returns-promise.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/001-prm-then-chain.ts ——
  (function () {
  Promise.resolve(1)
    .then((v: number) => v + 1)
    .then((v: number) => { console.log("chained", v); return v * 10; })
    .then((v: number) => console.log("last", v));
  console.log("sync-first");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/009-promise-then-returns-promise.ts ——
  (function () {
  Promise.resolve(1)
    .then((v) => Promise.resolve(v + 1))
    .then((v) => { console.log("value", v); return v * 10; })
    .then((v) => console.log("chained", v));
  console.log("sync-first");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/012-async-return-adopts-promise.ts ——
  (function () {
  async function f() { return Promise.resolve(7); }
  f().then((v) => console.log("v", v));
  console.log("sync");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/019-promise-adoption-chain-r317.ts ——
  (function () {
  Promise.resolve(1)
    .then((v) => Promise.resolve(v + 1))
    .then((v) => { console.log("chain", v); return v; })
    .then(async () => 5)
    .then((v) => console.log("pending-inner", v))
    .then(() => Promise.reject(new Error("x")))
    .catch((e: any) => console.log("reject-prop", e.message));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/025-promise-chaining-values.ts ——
  (function () {
  Promise.resolve(1)
    .then((v) => v + 1)
    .then((v) => Promise.resolve(v * 10))
    .then((v) => { console.log("final", v); return v; })
    .then((v) => { throw new Error("at " + v); })
    .catch((e) => "recovered:" + (e as Error).message)
    .then((v) => console.log(v));
  Promise.resolve("a").then(() => {}).then((v) => console.log("undefined-passthrough", v === undefined));
  Promise.reject(new Error("r1")).then(() => console.log("skip")).catch((e) => console.log("c1", (e as Error).message));
  console.log("sync");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/032-promise-adoption-chain-r7.ts ——
  (function () {
  const chain = Promise.resolve(1)
    .then((v) => Promise.resolve(v + 1))
    .then((v) => ({ v }))
    .then((o) => o.v * 10)
    .then((v) => { if (v !== 20) throw new Error("bad " + v); return "ok"; });
  chain.then((v) => console.log(v), (e) => console.log("err", String(e)));
  Promise.all([Promise.resolve("x"), 1, "y"]).then((all) => console.log(all.join("|")));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/045-promise-then-returns-promise.ts ——
  (function () {
  Promise.resolve(1)
    .then((v: number) => Promise.resolve(v * 10))
    .then((v: number) => console.log("flat", v));
  const nested: any = { then(resolve: any) { resolve(Promise.resolve("inner")); } };
  Promise.resolve(nested).then((v: any) => console.log("unwrap", v));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
