// xl:title 运行期造函数：new Function("a", "return a")(1)（账）
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe703-f-g09：`new Function(...)` 没实现：本仓抛 `Error`，JS 给一个真函数（`new Function("a", "return a")(1)` 是 `1`）。要做就要一条「从源码串造闭包」的路——走的是**另一份源码的解析 + 降级**，与 `eval` 同一族（都没有）。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/functions 里逐条一问的 1 条探针
// （probe703-f-g09）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 同 `new Function(...)` 那一族（与 126 同一处根）——本仓抛 Error、JS 给 1，如实登记

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe703-f-g09.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Function("a", "return a")(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
