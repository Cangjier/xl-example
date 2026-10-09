// xl:title WeakMap / WeakSet 的形状
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/map-set 里逐条一问的 1 条探针
// （probe3-m18）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// WeakMap 与 Map 同为「对象 + 可调用载荷」：set 那一格是函数

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe3-m18.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return typeof new Map().set === "function"; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
