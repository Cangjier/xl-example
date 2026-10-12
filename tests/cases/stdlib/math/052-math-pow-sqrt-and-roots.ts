// xl:title `pow` / `sqrt` / `cbrt` / `hypot` 的边界与特殊值
// xl:round 793
// xl:judge stdout
// xl:end
// **按判定点并组（第 793 轮）**：把 stdlib/math 里同一个判定点的 16 条并成这一条
// （保留 003-math-pow-sqrt；吸收 007-math-hypot-and-roots · 012-math-pow-and-roots-edge-root · 019-math-constants-and-pow · 030-math-pow-and-roots-edge-r371 · 040-math-sqrt-pow-special · 046-math-precision · probe-m07 · probe-m08 · probe-m23 · probe-m24 · probe2-h02 · probe2-h03 · probe2-h04 · probe2-h10 · probe2-h11）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `pow(NaN, 0)` 给 1、`pow(1, Infinity)` 给 NaN、`pow(0, -1)` 给 Infinity、`pow(-8, 1/3)` 给 NaN；`sqrt(-1)` 给 NaN；`hypot()` 给 0

// 保留条本身：003-math-pow-sqrt.ts
(() => {

  console.log(Math.pow(2, 10), Math.pow(2, 0.5) === Math.sqrt(2), Math.sqrt(16), Math.cbrt(27));
  console.log(Math.hypot(3, 4));
})();

// 吸收 007-math-hypot-and-roots.ts
(() => {

  console.log(Math.hypot(3, 4), Math.cbrt(27), Math.cbrt(-8));
  console.log(Math.exp(0), Math.log(1), Math.log10(1000), Math.log2(8), Math.log1p(0));
  console.log(Math.expm1(0), Math.sinh(0), Math.cosh(0), Math.tanh(0));
})();

// 吸收 012-math-pow-and-roots-edge-root.ts
(() => {

  console.log(Math.pow(2, 10), Math.pow(2, 0.5), Math.pow(-8, 1 / 3), Math.pow(0, 0));
  console.log(Math.sqrt(9), Math.sqrt(-1) !== Math.sqrt(-1), Math.sqrt(0));
  console.log(Math.cbrt(-27), Math.cbrt(8), Math.hypot(3, 4), Math.hypot());
})();

// 吸收 019-math-constants-and-pow.ts
(() => {

  console.log(Math.PI > 3.14, Math.E > 2.7, Math.LN2 > 0.69, Math.SQRT2 > 1.41);
  console.log(Math.pow(2, 10), 2 ** 10, Number.isNaN(Math.sqrt(-1)), Math.abs(-3));
})();

// 吸收 030-math-pow-and-roots-edge-r371.ts
(() => {
  console.log(Math.pow(2, 10), Math.pow(2, -1), Math.pow(-8, 1 / 3), Math.pow(1, Infinity));
  console.log(Math.sqrt(9), Math.sqrt(-1), 1 / Math.sqrt(0));
  console.log(Math.cbrt(27), Math.cbrt(-8), Math.hypot(3, 4), Math.hypot());
  console.log(Math.pow(NaN, 0), Math.pow(0, -1) === Infinity);
})();

// 吸收 040-math-sqrt-pow-special.ts
(() => {

  console.log(Math.sqrt(-1), Math.sqrt(0), 1 / Math.sqrt(-0), Math.sqrt(Infinity));
  console.log(Math.pow(0, 0), Math.pow(NaN, 0), Math.pow(1, Infinity), Math.pow(-8, 1 / 3));
  console.log(Math.exp(0), Math.exp(-Infinity), Math.log(0), Math.log1p(0));
})();

// 吸收 046-math-precision.ts
(() => {
  try { console.log("sin0", String(Math.sin(0))); } catch (e) { console.log("sin0", "ERR", String(e && e.name)); }
  try { console.log("cos0", String(Math.cos(0))); } catch (e) { console.log("cos0", "ERR", String(e && e.name)); }
  try { console.log("log1", String(Math.log(1))); } catch (e) { console.log("log1", "ERR", String(e && e.name)); }
  try { console.log("log0", String(Math.log(0))); } catch (e) { console.log("log0", "ERR", String(e && e.name)); }
  try { console.log("exp0", String(Math.exp(0))); } catch (e) { console.log("exp0", "ERR", String(e && e.name)); }
  try { console.log("atan2", String(Math.atan2(1, 1))); } catch (e) { console.log("atan2", "ERR", String(e && e.name)); }
  try { console.log("sqrt-negative", String(Math.sqrt(-1))); } catch (e) { console.log("sqrt-negative", "ERR", String(e && e.name)); }
  try { console.log("abs-negzero", String(1 / Math.abs(-0))); } catch (e) { console.log("abs-negzero", "ERR", String(e && e.name)); }
  try { console.log("pi", String(Math.PI.toFixed(5))); } catch (e) { console.log("pi", "ERR", String(e && e.name)); }
  try { console.log("floor-neg", String(Math.floor(-0.5))); } catch (e) { console.log("floor-neg", "ERR", String(e && e.name)); }
  try { console.log("ceil-neg", String(Math.ceil(-0.5))); } catch (e) { console.log("ceil-neg", "ERR", String(e && e.name)); }
  try { console.log("pow-frac", String(Math.pow(9, 0.5))); } catch (e) { console.log("pow-frac", "ERR", String(e && e.name)); }
})();

// 吸收 probe-m07.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.pow(2, 10)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m08.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.pow(-8, 1 / 3)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m23.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.cbrt(-27)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m24.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.hypot(5, 12)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h02.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.pow(NaN, 0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h03.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.pow(1, Infinity)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h04.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.pow(0, -1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h10.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.sqrt(-1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h11.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.hypot()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-m03.ts（第 1–2 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.pow(0, -1) + "|" + Math.pow(NaN, 0) + "|" + Math.pow(1, NaN)));
console.log(t(() => Math.pow(-8, 1 / 3) + "|" + Math.pow(-2, 3) + "|" + Math.pow(2, 1 / 0)));
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-m04.ts（第 1–1 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.hypot() + "|" + Math.hypot(3, 4) + "|" + Math.hypot(1, 1 / 0)));
})();
