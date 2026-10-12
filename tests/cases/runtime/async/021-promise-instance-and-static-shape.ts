// xl:title 承诺的对象形状：`instanceof` / `constructor` / 方法与静态面的 `typeof`
// xl:round 692
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 23 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · runtime/async/probe3-a03.ts
//   · runtime/async/probe3-a04.ts
//   · runtime/async/probe3-a06.ts
//   · runtime/async/probe3-a07.ts
//   · runtime/async/probe3-a08.ts
//   · runtime/async/probe3-a09.ts
//   · runtime/async/probe3-a11.ts
//   · runtime/async/probe3-a12.ts
//   · runtime/async/probe3-a14.ts
//   · runtime/async/probe3-a15.ts
//   · runtime/async/probe697-p01.ts
//   · runtime/async/probe697-p04.ts
//   · runtime/async/probe697-p06.ts
//   · runtime/async/probe697-p08.ts
//   · runtime/async/probe697-p09.ts
//   · runtime/async/probe697-p11.ts
//   · runtime/async/probe697-p12.ts
//   · runtime/async/probe697-p14.ts
//   · runtime/async/probe697-z02.ts
//   · runtime/async/probe697-z03.ts
//   · runtime/async/probe697-z10.ts
//   · runtime/async/probe697-z12.ts
//   · runtime/async/probe697-z14.ts
//
// 块与块之间**排空一次微任务队列**（每块后面那 200 轮 `await null`）：
// 不排空，两块各自的承诺链会交叉推进，读数就成了「并发形状」的读数、
// 不再是各条原来那个判定点的读数（实测：不排空时承诺链那一条与异步生成器那一条当场 differ）。
// 排空之后本条的 stdout = 各条 stdout 的**顺次相接**（第 798 轮用尺子逐字节核过）。

(async () => {
  // —— 并入自 runtime/async/probe3-a03.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return Promise.resolve(2).constructor === Promise; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a04.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const p = Promise.resolve(1); return p instanceof Promise; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a06.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return typeof Promise.resolve().then; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a07.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return typeof Promise.all; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a08.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return typeof Promise.race; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a09.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return typeof Promise.resolve().finally; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a11.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return typeof (async function () {}); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a12.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = async () => 1; return f() instanceof Promise; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a14.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return Promise.resolve(Promise.resolve(1)) instanceof Promise; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe3-a15.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const p = Promise.resolve(1); return typeof p.then(() => {}); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p01.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof Promise.resolve(1).then));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p04.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((async function () { return 1; })() instanceof Promise));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p06.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof new Promise((r) => r(1)).then));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p08.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const p = Promise.resolve(1); p.catch(() => {}); return p instanceof Promise; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p09.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Promise.all([]).constructor.name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p11.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((async function () { return await 1; })().constructor.name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p12.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof (async function () {}).constructor));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-p14.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Promise.resolve(Promise.resolve(2)).constructor.name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-z02.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const p = Promise.reject(1); p.catch(() => {}); return p instanceof Promise; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-z03.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const p = Promise.reject(1); p.catch(() => {}); return typeof p.then; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-z10.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof Promise.prototype.then));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-z12.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof Promise.resolve().catch));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
  // —— 并入自 runtime/async/probe697-z14.ts ——
  (function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const p = Promise.resolve(1); p.then(() => {}); return p.constructor === Promise; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
  })();
  for (let __drain = 0; __drain < 200; __drain++) await null;
})();
