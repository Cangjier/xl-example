// xl:title 对数与指数那一族，加上 `Math` 的常量
// xl:round 793
// xl:judge stdout
// xl:end
// **按判定点并组（第 793 轮）**：把 stdlib/math 里同一个判定点的 12 条并成这一条
// （保留 004-math-logs-constants；吸收 013-math-logs-and-exp-root · 016-math-cbrt-trunc-sign · 020-math-cbrt-expm1-log1p · 031-math-logs-and-exp-r371 · 043-l677p-math-modern-family · probe-m12 · probe-m13 · probe-m20 · probe-m21 · probe-m27 · probe-m28）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `log` / `log2` / `log10` / `log1p` / `exp` / `expm1` 的读数；常量是**数**不是方法（`PI` / `E` / `LN2` / `SQRT2`）

// 保留条本身：004-math-logs-constants.ts
(() => {

  console.log(Math.log(1), Math.log(Math.E) === 1, Math.exp(0), Math.exp(1) === Math.E);
  console.log(Math.PI > 3.14 && Math.PI < 3.15, Math.E > 2.7);
  console.log(typeof Math.PI, Math.PI * 2 > 6.28);
})();

// 吸收 013-math-logs-and-exp-root.ts
(() => {

  console.log(Math.log(1), Math.log(0), Math.log(-1) !== Math.log(-1));
  console.log(Math.log2(8), Math.log10(1000), Math.log1p(0));
  console.log(Math.exp(0), Math.expm1(0), Math.exp(1) > 2.7 && Math.exp(1) < 2.72);
})();

// 吸收 016-math-cbrt-trunc-sign.ts
(() => {

  console.log(Math.cbrt(27), Math.cbrt(-8), Math.trunc(-1.7), Math.sign(-3), Math.log2(8), Math.log10(1000));
})();

// 吸收 020-math-cbrt-expm1-log1p.ts
(() => {

  console.log(Math.cbrt(27), Math.cbrt(-8), Math.expm1(0), Math.log1p(0));
  console.log(Math.expm1(1).toFixed(6), Math.log1p(Math.E - 1).toFixed(6));
})();

// 吸收 031-math-logs-and-exp-r371.ts
(() => {
  console.log(Math.log(1), Math.log(0), Math.log(-1));
  console.log(Math.log2(8), Math.log10(1000), Math.log1p(0));
  console.log(Math.exp(0), Math.expm1(0), Math.log1p(Math.E - 1));
  console.log(Math.exp(1) === Math.E);
})();

// 吸收 043-l677p-math-modern-family.ts
(() => {

  console.log(Math.cbrt(27), Math.cbrt(-8), Math.fround(1.1), Math.clz32(1), Math.clz32(0), Math.imul(3, 4));
  console.log(Math.sign(-3), Math.sign(0), Math.sign(-0), Object.is(Math.sign(-0), -0), Math.sign(NaN));
  console.log(Math.hypot(3, 4), Math.hypot(), Math.hypot(3, 4, 12));
  console.log(Math.log2(8), Math.log10(1000), Math.log1p(0), Math.expm1(0));
  console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0), Math.asinh(0), Math.acosh(1), Math.atanh(0));
  console.log(Math.trunc(-4.7), Math.trunc(4.7), Math.floor(-0.5), Math.ceil(-0.5), Math.round(-0.5));
  console.log(Math.min(), Math.max(), Math.min(1, NaN), Math.max(-0, 0), Object.is(Math.max(-0, 0), 0));
})();

// 吸收 probe-m12.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.log10(1000)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m13.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.log1p(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m20.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.expm1(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m21.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.log2(8)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m27.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.LN2));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m28.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.SQRT2));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-m06.ts（第 1–2 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.expm1(0) + "|" + Math.log1p(0) + "|" + Math.expm1(1e-10)));
console.log(t(() => Math.log1p(1e-10) + "|" + Math.expm1(-40)));
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-m08.ts（第 1–2 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.PI.toFixed(10) + "|" + Math.E.toFixed(10) + "|" + Math.SQRT2.toFixed(10)));
console.log(t(() => Math.LN2.toFixed(10) + "|" + Math.LOG10E.toFixed(10)));
})();
