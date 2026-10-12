// xl:title 严格模式指令的位置与模块顶层的 this
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe701-s-t06：**模块顶层的 `this` 是 `undefined`**：裁判按 CJS 跑，那里 `this` 是 `module.exports`（一个对象）——所以 `(() => typeof this)()` 在 Node 里给 `"object"`、本仓给 `"undefined"`（本仓按 ESM 的口径给）。**箭头那一档本次已经对齐**（`function outer() { const f = () => { "use strict"; return typeof this; }; return f(); }` 两边都是 `"object"`），差的是**模块那一帧自己的 `this`**。要做。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/functions 里逐条一问的 10 条探针
// （probe701-s-t01 · probe701-s-t02 · probe701-s-t03 · probe701-s-t04 · probe701-s-t05 · probe701-s-t06 · probe701-s-t07 · probe701-s-t08 · probe701-s-t09 · probe701-s-t10）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 严格模式是整段函数的属性（写在中间也算），块 / 类方法体不开严格；模块顶层的 this 那一格如实登记

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe701-s-t01.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  (function () { "use strict"; return this === undefined ? "u" : typeof this; })();
  console.log(show((function () { "use strict"; return this === undefined ? "u" : typeof this; })()));
})();

// 吸收 probe701-s-t02.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  class A { m() { function f() { return this === undefined ? "u" : typeof this; } return f(); } }
  console.log(show(new A().m()));
})();

// 吸收 probe701-s-t03.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  function outer() { "use strict"; return (function () { return this === undefined ? "u" : typeof this; })(); }
  console.log(show(outer()));
})();

// 吸收 probe701-s-t04.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(show((function () { ("use strict"); return this === undefined ? "u" : typeof this; })()));
})();

// 吸收 probe701-s-t05.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(show((function () { const x = 1; "use strict"; return this === undefined ? "u" : typeof this; })()));
})();

// 吸收 probe701-s-t06.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(show((() => { "use strict"; return this === undefined ? "u" : typeof this; })()));
})();

// 吸收 probe701-s-t07.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(show((function () { "use strict"; return (function () { return this === undefined ? "u" : typeof this; })(); })()));
})();

// 吸收 probe701-s-t08.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  const o = { m() { function f() { return this === undefined ? "u" : typeof this; } return f(); } };
  console.log(show(o.m()));
})();

// 吸收 probe701-s-t09.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  function f() { "use strict"; return arguments.length; }
  console.log(show(f(1, 2)));
})();

// 吸收 probe701-s-t10.ts（第 701 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(show((function () { "use strict"; return typeof this; }).call(1)));
})();
