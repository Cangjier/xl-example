// xl:title 运行期造函数：new Function("a", "b", "return a + b")（账）
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe693b-f13：`new Function("a", "b", "return a + b")` 那一档（**运行期造函数**）本仓抛 `Error`（与 `probe693-f22` 同一条根）：`eval` / `Function` 构造这一族整体待做。要做。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/functions 里逐条一问的 1 条探针
// （probe693b-f13）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 本仓抛 Error、JS 给一个真函数——这一族是**同一条根**（从源码串造闭包），如实登记

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe693b-f13.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = new Function("a", "b", "return a + b"); return f(1, 2); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
