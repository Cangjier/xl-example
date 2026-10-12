// xl:title 提升与作用域：函数 / var / let、块与闭包
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe3-s03：`typeof x` 写在 `let x` **之前**该抛 `ReferenceError`（TDZ），本仓给 `"undefined"`——降级层判「这个名字在不在作用域链上」时看的是**声明有没有走到**（第 149 轮 `NameIsUnreachable` 那一支，说明里写着「TDZ 那一档是本仓已经记着的缺口」）。要做。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/functions 里逐条一问的 24 条探针
// （probe3-s01 · probe3-s03 · probe3-s04 · probe3-s05 · probe3-s06 · probe3-s07 · probe3-s08 · probe3-s09 · probe3-s10 · probe3-s11 · probe3-s12 · probe3-s14 · probe3-s15 · probe3-s16 · probe3-s17 · probe3-s19 · probe3-s20 · probe700-f-e26 · probe700-f-e28 · probe700-f-e29 · probe700-f-e30 · probe700-f-e31 · probe700-f-e32 · probe700-f-t06）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 函数提升 / var 提升 / let 的 TDZ / 块级作用域与遮蔽 / 循环闭包 / 立即调用的具名函数表达式

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe3-s01.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { f(); function f() { return 1; } return typeof f; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s03.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { return typeof x; let x = 1; } catch (e) { return e.constructor.name; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s04.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const fs = []; for (let i = 0; i < 3; i++) fs.push(() => i); return fs.map((f) => f()).join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s05.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const fs = []; for (var i = 0; i < 3; i++) fs.push(() => i); return fs.map((f) => f()).join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s06.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let n = 0; const f = () => { n = n + 1; return n; }; return f() + f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s07.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = { n: 1, f() { const g = () => this.n; return g(); } }; return o.f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s08.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const a = 1; { const a = 2; } return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s09.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let x = 1; { let x = 2; x = 3; } return x; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s10.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function outer() { return function inner() { return 1; }(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s11.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { var a = []; for (var i = 0; i < 2; i++) { (function (j) { a.push(j); })(i); } return a.join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s12.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { throw 1; } catch (e) { var w = 2; } return w; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s14.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const fs = []; for (const v of [1, 2]) fs.push(() => v); return fs.map((f) => f()).join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s15.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let n = 0; { n = n + 1; } return n; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s16.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const x = 1; function g() { return x; } return g(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s17.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const o = {}; o.f = function () { return 1; }; return o.f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s19.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const arr = []; arr.push(typeof f); function f() {} return arr.join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-s20.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { if (true) { function h() { return 3; } } return typeof h; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e26.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return f.name; function f() {} })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e28.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const fs = []; for (var i = 0; i < 3; i++) fs.push(() => i); return fs.map(f => f()).join(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e29.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const fs = []; for (let i = 0; i < 3; i++) fs.push(() => i); return fs.map(f => f()).join(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e30.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f() { return 1; } return typeof f; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e31.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return typeof f; function f() {} })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e32.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function f(n) { return n === 0 ? 0 : f(n - 1) + n; })(4)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-t06.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  const f = function () { return f2(); };
  function f2() { return "ok"; }
  console.log(show(f()));
})();
