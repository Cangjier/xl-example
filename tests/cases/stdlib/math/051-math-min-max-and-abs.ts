// xl:title `min` / `max` / `abs`：空实参、NaN 传染、±0 的取舍、非数值实参
// xl:round 793
// xl:judge stdout
// xl:end
// **按判定点并组（第 793 轮）**：把 stdlib/math 里同一个判定点的 15 条并成这一条
// （保留 002-math-abs-min-max；吸收 005-math-isnan-family · 009-math-min-max-edge-root · 011-math-sign-and-negzero · 018-math-round-and-minmax-edges · 029-math-min-max-edge-r371 · 038-math-minmax-zero-and-nan · 045-arg-math-round · probe-m05 · probe-m06 · probe2-h05 · probe2-h06 · probe2-h07 · probe2-h12 · probe2-h13）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 空参给 `Infinity` / `-Infinity`；NaN 传染；`min(0, -0)` 给 `-0`、`max(-0, 0)` 给 `0`；字符串按 `ToNumber`（不能转就是 NaN）

// 保留条本身：002-math-abs-min-max.ts
(() => {

  console.log(Math.abs(-5), Math.abs(5), Math.min(3, 1, 2), Math.max(3, 1, 2));
  console.log(Math.min(), Math.max(), Math.min(-0, 0));
})();

// 吸收 005-math-isnan-family.ts
(() => {

  console.log(Math.floor("2.5" as any), Math.abs("-3" as any));
  console.log(Math.max(1, "9" as any), Math.min(1, NaN));
})();

// 吸收 009-math-min-max-edge-root.ts
(() => {

  console.log(Math.min(3, 1, 2), Math.max(3, 1, 2), Math.min(), Math.max());
  console.log(Math.min(NaN, 1), Math.max(Infinity, 1), Math.min(-Infinity, 1));
  console.log(Math.abs(-0), 1 / Math.abs(-0), Math.abs(-0) === 0);
})();

// 吸收 011-math-sign-and-negzero.ts
(() => {

  console.log(Math.sign(-0), 1 / Math.sign(-0), Math.sign(0), Math.sign(-3), Math.sign(NaN));
  console.log(1 / Math.abs(-0), 1 / Math.abs(0));
  console.log(Math.min(0, -0), 1 / Math.min(0, -0), Math.max(-0, 0), 1 / Math.max(-0, 0));
  console.log(Math.min(), Math.max(), Math.min(NaN, 1), Math.max(NaN, 1));
})();

// 吸收 018-math-round-and-minmax-edges.ts
(() => {

  console.log(Math.round(2.5), Math.round(-2.5), Math.round(0.5));
  console.log(Math.min(), Math.max(), Math.min("2", 1), Math.max(-0, 0), Math.min(-0, 0));
  console.log(Math.hypot(3, 4), Math.hypot());
})();

// 吸收 029-math-min-max-edge-r371.ts
(() => {
  console.log(Math.min(), Math.max());
  console.log(Math.min(1, NaN), Math.max(1, NaN), Math.min(NaN, 1));
  console.log(1 / Math.min(0, -0), 1 / Math.max(-0, 0));
  console.log(Math.min("2" as any, 3), Math.max(1, 2, 3));
})();

// 吸收 038-math-minmax-zero-and-nan.ts
(() => {

  console.log(Math.min(0, -0), 1 / Math.min(0, -0), Math.max(0, -0), 1 / Math.max(0, -0));
  console.log(Math.min(NaN, 1), Math.max(NaN, 1), Math.min(), Math.max());
  console.log(Math.min(1, 2, 3), Math.max(-1, -2));
})();

// 吸收 045-arg-math-round.ts
(() => {
  try { console.log("round-2.5", String(Math.round(2.5))); } catch (e) { console.log("round-2.5", "ERR", String(e && e.name)); }
  try { console.log("round--2.5", String(Math.round(-2.5))); } catch (e) { console.log("round--2.5", "ERR", String(e && e.name)); }
  try { console.log("round--0.5", String(Math.round(-0.5))); } catch (e) { console.log("round--0.5", "ERR", String(e && e.name)); }
  try { console.log("round-0.5", String(Math.round(0.5))); } catch (e) { console.log("round-0.5", "ERR", String(e && e.name)); }
  try { console.log("min-empty", String(Math.min())); } catch (e) { console.log("min-empty", "ERR", String(e && e.name)); }
  try { console.log("max-empty", String(Math.max())); } catch (e) { console.log("max-empty", "ERR", String(e && e.name)); }
  try { console.log("hypot", String(Math.hypot(3, 4))); } catch (e) { console.log("hypot", "ERR", String(e && e.name)); }
  try { console.log("cbrt", String(Math.cbrt(27))); } catch (e) { console.log("cbrt", "ERR", String(e && e.name)); }
  try { console.log("sign--0", String(1 / Math.sign(-0))); } catch (e) { console.log("sign--0", "ERR", String(e && e.name)); }
  try { console.log("trunc--1.7", String(Math.trunc(-1.7))); } catch (e) { console.log("trunc--1.7", "ERR", String(e && e.name)); }
  try { console.log("clz32", String(Math.clz32(1))); } catch (e) { console.log("clz32", "ERR", String(e && e.name)); }
  try { console.log("imul", String(Math.imul(3, 4))); } catch (e) { console.log("imul", "ERR", String(e && e.name)); }
  try { console.log("fround", String(Math.fround(1.1))); } catch (e) { console.log("fround", "ERR", String(e && e.name)); }
  try { console.log("pow", String(Math.pow(2, 10))); } catch (e) { console.log("pow", "ERR", String(e && e.name)); }
})();

// 吸收 probe-m05.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.abs(-0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m06.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.max(1, NaN)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h05.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.is(Math.min(0, -0), -0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h06.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.is(Math.max(-0, 0), 0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h07.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.abs(-Infinity)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h12.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.max(1, "2")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h13.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.min(1, "x")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-m10.ts（第 1–2 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Math.abs("-3" as any) + "|" + Math.floor("2.7" as any)));
console.log(t(() => Math.max(1, "5" as any, true as any) + "|" + Math.min(null as any, 1)));
})();
