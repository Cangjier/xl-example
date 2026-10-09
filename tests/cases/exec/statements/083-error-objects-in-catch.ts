// xl:title catch 里的错误对象：name / message / instanceof 与内层错误
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮（三））**：吸收 exec/statements 里逐条一问的 3 条探针
// （probe701-c-e15 · probe701-c-e18 · probe701-c-e40）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// TypeError / Error / RangeError 三个出口自己那一格

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe701-c-e15.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { throw new TypeError('t'); } catch (e) { return e.name + ':' + e.message; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e18.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const e = new Error('m'); return e.message + '|' + e.name; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe701-c-e40.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const err = new RangeError('r'); return err instanceof RangeError; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// **同一条根并账（第 791 轮）**：catch 绑定接住抛出来的东西（Error / 数字 / 字符串）
// 吸收 stdlib/error/probe704-e-a25.ts（同一条根）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { throw new Error("x"); } catch (e) { return e.message; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 stdlib/error/probe704-e-a26.ts（同一条根）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { throw 1; } catch (e) { return typeof e; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 stdlib/error/probe704-e-a27.ts（同一条根）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { throw "s"; } catch (e) { return e; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
