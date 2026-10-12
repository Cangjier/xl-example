// xl:title 符号作属性键：不进 `Object.keys` / `JSON`，能列进 `getOwnPropertySymbols`、`in` / `entries` / `assign`
// xl:round 650
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 8 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/032-symbol-keyed-method.ts
//   · stdlib/symbol/probe697-y11.ts
//   · stdlib/symbol/probe697-y12.ts
//   · stdlib/symbol/probe697-y13.ts
//   · stdlib/symbol/probe697-y14.ts
//   · stdlib/symbol/probe697-y15.ts
//   · stdlib/symbol/probe697-y16.ts
//   · stdlib/symbol/probe697-y17.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/032-symbol-keyed-method.ts ——
(function () {
  class Res {
    closed = false;
    [Symbol.dispose]() {
      this.closed = true;
      return "disposed";
    }
  }
  const r = new Res();
  console.log(Object.keys(r).join(",") === "closed", typeof r[Symbol.dispose], r[Symbol.dispose](), r.closed);
  const key = Symbol("k");
  const obj: any = { [key]: 1, plain: 2 };
  console.log(Object.keys(obj).join(","), obj[key], Object.getOwnPropertySymbols(obj).length);
})();

// —— 并入自 stdlib/symbol/probe697-y11.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.getOwnPropertySymbols({ [Symbol("a")]: 1 }).length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y12.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = {}; const s = Symbol("k"); o[s] = 5; return Object.keys(o).length + "," + o[s]; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y13.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(JSON.stringify({ [Symbol("a")]: 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y14.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show([...Object.getOwnPropertySymbols({ [Symbol.for("a")]: 1 })].map(String).join(",")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y15.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const s = Symbol("k"); const o = { [s]: 1 }; return s in o; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y16.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const s = Symbol("k"); const o = { [s]: 1 }; return Object.entries(o).length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y17.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const s = Symbol("k"); const o = { [s]: 1, a: 2 }; return Object.assign({}, o)[s]; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
