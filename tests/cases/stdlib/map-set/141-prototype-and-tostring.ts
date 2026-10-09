// xl:title 集合族自己那一格：prototype / constructor / instanceof / toString
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/map-set 里逐条一问的 8 条探针
// （p-map-tostring · probe3-m12 · probe696-m20·21 · probe703-m-d19·20 · probe703-m-d29·30）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 内部槽不进 Object.keys 与 JSON、Object.prototype.toString 的标签、instanceof 与 typeof 那一格

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p-map-tostring.ts（第 692 轮）
(() => {
  console.log(Object.prototype.toString.call(new Map()), Object.prototype.toString.call(new Set()));
})();

// 吸收 probe3-m12.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const m = new Map([["a", 1]]); return Object.prototype.toString.call(m); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-m20.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(JSON.stringify(new Map([[1, "a"]]))));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-m21.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(JSON.stringify(new Set([1]))));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-m-d19.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Set([1, 2]) instanceof Set));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-m-d20.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map() instanceof Map));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-m-d29.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof new Map().set));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-m-d30.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof new WeakMap().set));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
