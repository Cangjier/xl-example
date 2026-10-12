// xl:title 微任务次序：同步先跑完、`then` 逐环推进、`await` 与 `then` 同队混排
// xl:round 298
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 16 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/007-prm-microtask-order.ts
//   · runtime/async/008-async-reject-then-sync.ts
//   · runtime/async/015-microtask-order-mixed.ts
//   · runtime/async/026-async-await-order.ts
//   · runtime/async/029-microtask-and-sync-mixing.ts
//   · runtime/async/036-microtask-order.ts
//   · runtime/async/039-promise-microtask-order.ts
//   · runtime/async/040-microtask-order.ts
//   · runtime/async/043-promise-chain-order.ts
//   · runtime/async/probe3-a01.ts
//   · runtime/async/probe3-a02.ts
//   · runtime/async/probe3-a05.ts
//   · runtime/async/probe3-a10.ts
//   · runtime/async/probe3-a13.ts
//   · runtime/async/probe697-p02.ts
//   · runtime/async/probe697-p15.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/007-prm-microtask-order.ts ——
  (function () {
  console.log("1");
  Promise.resolve().then(() => console.log("3"));
  Promise.resolve().then(() => { console.log("4"); Promise.resolve().then(() => console.log("5")); });
  console.log("2");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/008-async-reject-then-sync.ts ——
  (function () {
  class Box {
    private data = new Map<string, number>();
    add(key: string, value: number): void { this.data.set(key, value); }
    async total(key: string): Promise<number> {
      const found = this.data.get(key);
      if (found === undefined) throw new Error("no key " + key);
      return found;
    }
  }
  const box = new Box();
  box.add("a", 1);
  box.total("zzz").catch((e: any) => console.log("caught", e.message));
  console.log("sync after");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/015-microtask-order-mixed.ts ——
  (function () {
  console.log("a");
  Promise.resolve().then(() => console.log("b"));
  async function f() {
    console.log("c");
    await null;
    console.log("d");
  }
  f();
  Promise.resolve().then(() => console.log("e"));
  console.log("f");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/026-async-await-order.ts ——
  (function () {
  async function f(): Promise<number> {
    console.log("f-start");
    const a = await Promise.resolve(1);
    console.log("f-mid");
    const b = await 2;
    console.log("f-end");
    return a + b;
  }
  console.log("before");
  f().then((v) => console.log("result", v));
  console.log("after");
  (async () => {
    for (const v of [1, 2]) {
      const r = await Promise.resolve(v * 10);
      console.log("loop", r);
    }
  })();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/029-microtask-and-sync-mixing.ts ——
  (function () {
  const order: string[] = [];
  order.push("start");
  Promise.resolve().then(() => order.push("p1"));
  order.push("sync1");
  (async () => { order.push("async-start"); await null; order.push("async-after-await"); })();
  queueMicrotask(() => order.push("qm"));
  order.push("sync2");
  Promise.resolve().then(() => { order.push("p2"); return Promise.resolve(); }).then(() => order.push("p3"));
  queueMicrotask(() => console.log("microtask-order", order.join(",")));
  console.log("sync-order", order.join(","));
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/036-microtask-order.ts ——
  (function () {
  (async () => {
    const order: string[] = [];
    order.push('sync');
    Promise.resolve().then(() => { order.push('t1'); });
    Promise.resolve().then(() => { order.push('t2'); }).then(() => { order.push('t3'); });
    order.push('sync2');
    await Promise.resolve();
    console.log(order.join(','));
  })();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/039-promise-microtask-order.ts ——
  (function () {
  const log: string[] = [];
  async function inner() { log.push('i1'); await null; log.push('i2'); }
  (async () => {
    log.push('a');
    const p = inner();
    log.push('b');
    await p;
    log.push('c');
    await 0;
    log.push('d');
    console.log(log.join(','));
  })();
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/040-microtask-order.ts ——
  (function () {
  async function main(): Promise<void> {
    console.log("a");
    await null;
    console.log("c");
  }
  console.log("start");
  main();
  Promise.resolve().then(() => console.log("b"));
  console.log("end");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/043-promise-chain-order.ts ——
  (function () {
  Promise.resolve(1)
    .then((v: number) => { console.log("t1", v); return v + 1; })
    .then((v: number) => { console.log("t2", v); });
  console.log("sync");
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a01.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const seen = []; Promise.resolve(1).then((v) => seen.push(v)); seen.push(0); return seen.join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a02.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let out = ""; Promise.resolve(1).then((v) => { out += v; }).then(() => { out += "!"; }); return out; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a05.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let r = "no"; Promise.reject(new Error("x")).catch((e) => { r = e.message; }); return r; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a10.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let n = 0; const p = new Promise((res) => { n = 1; res(2); }); return n; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a13.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let out = "a"; (async () => { out += "b"; })(); out += "c"; return out; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p02.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const out = []; Promise.resolve().then(() => out.push(1)); out.push(0); return out.join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p15.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let out = "no"; const p = Promise.resolve(1); p.then(() => { out = "yes"; }); return out; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
