// xl:title 函数的 this 与 arguments：严格 / 松散 / 长度
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 2 条探针
// （p706a-f01 · p706a-f02）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 严格模式下裸调用的 this 是 undefined；松散模式是全局对象

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-f01.ts（第 706 轮）
(() => {
  const f = function () { "use strict"; return this; };
  console.log(show(f()));
})();

// 吸收 p706a-f02.ts（第 706 轮）
(() => {
  const f = function () { return this === globalThis; };
  console.log(show(f()));
})();
