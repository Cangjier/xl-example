// xl:title 三角与双曲：`sin` / `cos` / `tan` / `atan2` / `sinh` / `cosh` / `tanh` / `asinh` / `acosh` / `atanh`
// xl:round 793
// xl:judge stdout
// xl:end
// **按判定点并组（第 793 轮）**：把 stdlib/math 里同一个判定点的 9 条并成这一条
// （保留 014-math-trig-and-hyperbolic；吸收 021-math-atan2-forms · 032-math-trig-hyperbolic · probe-m14 · probe-m15 · probe-m16 · probe-m17 · probe-m18 · probe-m19）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `atan2` 的四个象限与零、双曲族在 0 上的读数（`cosh(0)=1`、`acosh(1)=0`、`atanh(0)=0`）

// 保留条本身：014-math-trig-and-hyperbolic.ts
(() => {

  console.log(Math.sin(0), Math.cos(0), Math.tan(0), Math.sin(Math.PI / 2));
  console.log(Math.atan2(0, 1), Math.atan2(1, 0), Math.asin(0), Math.acos(1));
  console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0), Math.sinh(1) > 1.17);
})();

// 吸收 021-math-atan2-forms.ts
(() => {

  console.log(Math.atan2(1, 1).toFixed(6), Math.atan2(1, -1).toFixed(6));
  console.log(Math.atan2(-1, -1).toFixed(6), Math.atan2(0, 0), Math.atan2(1, 0).toFixed(6));
})();

// 吸收 032-math-trig-hyperbolic.ts
(() => {
  console.log(Math.sin(0), Math.cos(0), Math.tan(0));
  console.log(Math.sin(Math.PI / 2), Math.cos(Math.PI));
  console.log(Math.asin(0), Math.acos(1), Math.atan(0), Math.atan2(0, -1) === Math.PI);
  console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0));
  console.log(Math.asinh(0), Math.acosh(1), Math.atanh(0));
  console.log(Math.sin(Infinity), Math.atan2(0, 0));
})();

// 吸收 probe-m14.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.cosh(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m15.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.tanh(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m16.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.atanh(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m17.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.asinh(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m18.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.acosh(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m19.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.sinh(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-m07.ts（第 1–2 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.acos(2) + "|" + Math.asin(-2) + "|" + Math.atan2(0, -0)));
console.log(t(() => Math.atan2(-0, -0) + "|" + Math.atanh(1) + "|" + Math.acosh(0.5)));
})();
