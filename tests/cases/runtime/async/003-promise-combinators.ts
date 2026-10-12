// xl:title 组合子：`Promise.all` / `race` / `allSettled` 的次序、空表与普通值混排
// xl:round 305
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 4 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/004-prm-combinators.ts
//   · runtime/async/016-promise-all-async-fns.ts
//   · runtime/async/037-promise-all-mixed.ts
//   · runtime/async/044-promise-all-order.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/004-prm-combinators.ts ——
  (function () {
  Promise.all([Promise.resolve(1), Promise.resolve(2), 3]).then((xs: any) => console.log("all", xs.join(",")));
  Promise.race([Promise.resolve("fast"), Promise.resolve("slow")]).then((v: any) => console.log("race", v));
  Promise.all([]).then((xs: any) => console.log("empty", xs.length));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/016-promise-all-async-fns.ts ——
  (function () {
  async function f(n: number) { return n * 2; }
  Promise.all([f(1), f(2), 3]).then((xs) => console.log(xs.join(",")));
  console.log("start");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/037-promise-all-mixed.ts ——
  (function () {
  (async () => {
    const out = await Promise.all([1, Promise.resolve(2), 'x']);
    console.log(out.join(','));
    const nested = await Promise.all([Promise.resolve([1, 2]), Promise.resolve([3])]);
    console.log(nested.map((a: any) => a.join('-')).join('|'));
  })();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/044-promise-all-order.ts ——
  (function () {
  Promise.all([Promise.resolve(2), 1, Promise.resolve(3)] as any).then((v: any) => console.log(JSON.stringify(v)));
  Promise.all([] as any).then((v: any) => console.log("empty", JSON.stringify(v)));
  Promise.allSettled([Promise.reject(new Error("x")), 1] as any).then((v: any) => console.log(v.map((e: any) => e.status).join(",")));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
