// xl:title 箭头函数与形参默认值
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe700-f-e36：形参默认值里的 **TDZ** 没做：`function (a = b, b = 2) { return a; }()` 在 JS 里抛 `ReferenceError`（`b` 还没初始化），本仓读成 `undefined`。同一根还有 `typeof` 一个还没初始化的 `let`（台账 `runtime/…probe3-s03`）。要做。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/functions 里逐条一问的 18 条探针
// （probe700-f-e01 · probe700-f-e02 · probe700-f-e03 · probe700-f-e04 · probe700-f-e05 · probe700-f-e06 · probe700-f-e14 · probe700-f-e15 · probe700-f-e16 · probe700-f-e17 · probe700-f-e35 · probe700-f-e36 · probe700-f-e49 · probe693b-f20 · probe693b-f21 · probe700-f-t01 · probe700-f-t03 · probe700-f-t07）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 解构 / 默认值 / 剩余参数的求值次序与惰性；对象字面量里的方法与访问器；默认值里的 TDZ（登记）

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe700-f-e01.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(((a = 1) => a)()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e02.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(((a, b = a + 1) => b)(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e03.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(((...xs) => xs.length)(1, 2, 3)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e04.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(((a, ...xs) => a + xs.length)(1, 2, 3)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e05.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((({ a, b = 2 }) => a + b)({ a: 1 })));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e06.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((([a, b = 2]) => a + b)([1])));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e14.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(({ m() { return 1; } }).m()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e15.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(({ get a() { return 3; }, set a(v) { this.v = v; } }).a));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e16.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.getOwnPropertyDescriptor({ get a() { return 1; } }, 'a').enumerable));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e17.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.getOwnPropertyDescriptor({ get a() { return 1; } }, 'a').configurable));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e35.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function (a = () => 1) { return a(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e36.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function (a = b, b = 2) { return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e49.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(((a = 1, b = 2) => a + b)()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-f20.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f(a = 1, b = 2) { return a + b; } return f(undefined, 3); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-f21.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f({ a = 1 } = {}) { return a; } return f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-t01.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  const log = [];
  function f(a = log.push("a"), b = log.push("b")) { log.push("body"); }
  f();
  console.log(log.join(","));
})();

// 吸收 probe700-f-t03.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  let calls = 0;
  const o = { get v() { calls++; return 1; } };
  const { v } = o;
  console.log(show(v) + "|" + show(calls));
})();

// 吸收 probe700-f-t07.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  class A { m() { return "m"; } n = function () { return typeof this; }; }
  console.log(show(new A().n()) + "|" + show(new A().m()));
})();
