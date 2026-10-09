// xl:title 取整那一族：半值向 +Infinity、负数、`-0`、`trunc` 与 `sign`
// xl:round 793
// xl:judge stdout
// xl:end
// **按判定点并组（第 793 轮）**：把 stdlib/math 里同一个判定点的 26 条并成这一条
// （保留 001-math-rounding-root；吸收 006-math-trunc-sign · 010-math-rounding-boundaries-root · 022-math-sign-and-trunc-forms · 024-math-round-half-and-float · 025-math-sign-negzero-and-trunc · 026-math-rounding-table · 027-math-round-ties · 028-math-rounding-boundaries-r371 · 035-math-rounding-r623 · 039-math-trunc-sign-abs-edge · 041-math-round-and-fround-grid · 042-math-rounding-family · 047-math-rounding · 049-math-floor-0-5 · p-math-negzero · probe-m01 · probe-m02 · probe-m04 · probe-m09 · probe-m10 · probe-m22 · probe2-h01 · probe2-h09 · probe2-h14 · probe2-h15）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `round` 的半值**一律朝 +Infinity**（`-2.5 → -2`）、`floor` / `ceil` / `trunc` 在 ±0.5 上的读数、`sign` 的 ±0 与 NaN、以及 `Object.is` 看得见的 `-0`

// 保留条本身：001-math-rounding-root.ts
(() => {

  console.log(Math.floor(1.7), Math.floor(-1.2), Math.ceil(1.2), Math.ceil(-1.7));
  console.log(Math.round(1.5), Math.round(2.5), Math.round(-1.5), Math.trunc(-1.7), Math.sign(-3), Math.sign(0));
})();

// 吸收 006-math-trunc-sign.ts
(() => {

  console.log(Math.trunc(4.7), Math.trunc(-4.7), Math.floor(-4.1), Math.ceil(-4.1));
  console.log(Math.sign(-3), Math.sign(0), Math.sign(3), Math.sign(-0), Math.sign(NaN));
  console.log(Math.round(2.5), Math.round(-2.5), Math.round(2.4));
})();

// 吸收 010-math-rounding-boundaries-root.ts
(() => {

  console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
  console.log(Math.floor(-1.5), Math.ceil(-1.5), Math.trunc(-1.5));
  console.log(Math.floor(1.5), Math.ceil(1.5), Math.trunc(1.9), Math.trunc(-1.9));
  console.log(Math.round(NaN), Math.round(Infinity));
})();

// 吸收 022-math-sign-and-trunc-forms.ts
(() => {

  console.log(Math.sign(-3), Math.sign(0), Object.is(Math.sign(-0), -0), Math.sign(NaN));
  console.log(Math.trunc(4.9), Math.trunc(-4.9), Math.trunc(0.5), Math.trunc(-0.5));
})();

// 吸收 024-math-round-half-and-float.ts
(() => {

  console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5), Math.round(1.005 * 100) / 100);
})();

// 吸收 025-math-sign-negzero-and-trunc.ts
(() => {

  console.log(Math.sign(-0), 1 / Math.sign(-0), Math.trunc(-0.9), Math.trunc(0.9), Math.cbrt(-8));
})();

// 吸收 026-math-rounding-table.ts
(() => {

  console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
  console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.trunc(-0.9), Math.sign(-3), 1 / Math.sign(-0));
  console.log(Math.min(), Math.max(), Math.min(0, -0), 1 / Math.min(0, -0));
})();

// 吸收 027-math-round-ties.ts
(() => {

  console.log(Math.round(0.5), Math.round(1.5), Math.round(-0.5), Math.round(-1.5));
  console.log(Math.trunc(-1.7), Math.floor(-1.2), Math.ceil(-1.2));
  console.log(Math.sign(-0), 1 / Math.sign(-0));
})();

// 吸收 028-math-rounding-boundaries-r371.ts
(() => {
  console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
  console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.trunc(-0.5), Math.trunc(0.5));
  console.log(1 / Math.round(-0.5), 1 / Math.floor(-0), 1 / Math.ceil(-0.5));
  console.log(Math.round(4.5), Math.round(5.5), Math.round(1e21));
})();

// 吸收 035-math-rounding-r623.ts
(() => {

  console.log(Math.round(-0.5), Object.is(Math.round(-0.5), -0), Math.round(0.5));
  console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.floor(-1.5), Math.ceil(-1.5));
})();

// 吸收 039-math-trunc-sign-abs-edge.ts
(() => {

  console.log(Math.trunc(1.9), Math.trunc(-1.9), Math.trunc(-0.5), 1 / Math.trunc(-0.5));
  console.log(Math.sign(-0), 1 / Math.sign(-0), Math.sign(0), Math.sign(NaN), Math.sign(Infinity));
  console.log(Math.abs(-0), 1 / Math.abs(-0), Math.abs(NaN), Math.abs(-Infinity));
})();

// 吸收 041-math-round-and-fround-grid.ts
(() => {

  console.log(Math.round(-0.5), 1 / Math.round(-0.5), Math.round(0.5), Math.round(-1.5), Math.round(2.5));
  console.log(Math.floor(-0.5), Math.ceil(-0.5), Math.floor(-1.5), Math.ceil(1.2));
  console.log(Math.round(1e21), Math.floor(0.5) + Math.ceil(0.5));
})();

// 吸收 042-math-rounding-family.ts
(() => {

  console.log(Math.round(2.5), Math.round(-2.5), Math.floor(-2.5), Math.ceil(-2.5), Math.trunc(-2.5));
  console.log(Math.sign(-3), Math.sign(0), Math.sign(3));
  console.log(Math.min(3, 1, 2), Math.max(3, 1, 2), Math.abs(-0));
})();

// 吸收 047-math-rounding.ts
(() => {
  console.log(Math.round(-0.5), Math.round(0.5), Math.round(-1.5), Math.round(2.5));
  console.log(Object.is(Math.round(-0.4), -0));
  console.log(Math.trunc(-1.7), Math.sign(-0), Object.is(Math.sign(-0), -0));
})();

// 吸收 049-math-floor-0-5.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/math/probe-m03.ts
  //   · stdlib/math/probe2-h08.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.floor(-0.5)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 p-math-negzero.ts
(() => {

  console.log(Math.sign(-3), Object.is(Math.sign(-0), -0), Object.is(Math.round(-0.5), -0));
})();

// 吸收 probe-m01.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.round(2.5)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m02.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.round(-2.5)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m04.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.ceil(-0.5)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m09.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.sign(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m10.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.sign(NaN)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m22.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.trunc(0.9)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h01.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.round(0.49999999999999994)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h09.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.ceil(-0.5) === 0));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h14.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.sign(-0.5)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-h15.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.trunc(-0.5) === 0));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
