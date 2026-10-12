// xl:title String.prototype 上那三个接正则的方法没装（账）
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe703-s-e36：`String.prototype.match` 没装（`typeof` 给 `undefined`，Node 给 `"function"`）——与 `stdlib/string/211-string-proto-member-table-regex-members-missing` 同一条根。要做。；probe703-s-e37：`String.prototype.matchAll` 没装——同上。；probe703-s-e38：`String.prototype.search` 没装——同上。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/string 里逐条一问的 3 条探针
// （probe703-s-e36…38）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// match / matchAll / search 在属性表里根本没有那一格——与 stdlib/string/211 同一条根
// （第 812 轮把原来并排的两条 `136` / `147` 并成了一条 211，引用跟着改。）

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe703-s-e36.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof "abc".match));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-s-e37.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof "abc".matchAll));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-s-e38.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof "abc".search));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
