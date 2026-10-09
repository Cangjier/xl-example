// xl:title 32 位工具：`imul` / `clz32` / `fround`
// xl:round 793
// xl:judge stdout
// xl:end
// **按判定点并组（第 793 轮）**：把 stdlib/math 里同一个判定点的 14 条并成这一条
// （保留 008-math-imul-clz32；吸收 015-math-imul-clz32-fround-root · 017-math-more-members · 023-math-clz32-forms · 033-math-imul-clz32-fround-r371 · 034-math-edges · 036-math-fround-and-clz · 037-math-fround-and-clz32 · 048-math-extra · p-math-bit-helpers · p-math-cbrt-fround · probe-m11 · probe-m25 · probe-m26）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `imul` 走 32 位回绕、`clz32` 数前导零（0 给 32）、`fround` 落到单精度

// 保留条本身：008-math-imul-clz32.ts
(() => {

  console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0xffffffff, 5));
  console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000));
  console.log(Math.fround(1.5), Math.fround(1 / 3), Math.fround(0.1));
})();

// 吸收 015-math-imul-clz32-fround-root.ts
(() => {

  console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0xffffffff, 5));
  console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000));
  console.log(Math.fround(1.5), Math.fround(0.1), Math.fround(1e40));
})();

// 吸收 017-math-more-members.ts
(() => {

  console.log(Math.fround(1.5), Math.clz32(1), Math.cbrt(27), Math.trunc(-1.5), Math.sign(-0));
  console.log(Math.log2(8), Math.log10(1000), Math.log1p(0), Math.expm1(0));
  console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0), Math.atan2(1, 1));
})();

// 吸收 023-math-clz32-forms.ts
(() => {

  console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0xffffffff), Math.clz32(4));
  console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.fround(0.1).toFixed(10));
})();

// 吸收 033-math-imul-clz32-fround-r371.ts
(() => {
  console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0x7fffffff, 2));
  console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000), Math.clz32(-1));
  console.log(Math.fround(1.5), Math.fround(0.1), Math.fround(1e40));
  console.log(Math.sign(-3), Math.sign(0), Math.sign(-0), Math.sign(NaN));
  console.log(Math.trunc(4.9), Math.trunc(-4.9));
})();

// 吸收 034-math-edges.ts
(() => {

  console.log(Math.clz32(1), Math.imul(3, 4), Math.fround(1.5), Math.hypot(3, 4));
  console.log(Math.cbrt(27), Math.sign(-0), Math.trunc(-1.7), Math.log2(8), Math.log10(1000));
  console.log(Math.min(), Math.max(), Math.min(1, NaN));
})();

// 吸收 036-math-fround-and-clz.ts
(() => {

  console.log(Math.fround(0.1), Math.fround(1e300), Math.fround(-0));
  console.log(Math.imul(0x7fffffff, 2), Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000));
  console.log(Math.hypot(), Math.hypot(3, 4), Math.sign(-0), Object.is(Math.sign(-0), -0));
})();

// 吸收 037-math-fround-and-clz32.ts
(() => {

  console.log(Math.fround(1.5), Math.fround(0.1), Math.fround(-0), 1 / Math.fround(-0));
  console.log(Math.clz32(0), Math.clz32(1), Math.clz32(0xffffffff), Math.clz32(2));
  console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0x7fffffff, 2), Math.imul(2, -2));
})();

// 吸收 048-math-extra.ts
(() => {
  console.log(Math.hypot(3, 4), Math.hypot());
  console.log(Math.clz32(1), Math.clz32(0), Math.imul(3, 4));
  console.log(Math.fround(0.1), Math.fround(1e300));
})();

// 吸收 p-math-bit-helpers.ts
(() => {

  console.log(Math.clz32(1), Math.imul(0xffffffff, 5), Math.hypot(3, 4), Math.trunc(-1.9));
})();

// 吸收 p-math-cbrt-fround.ts
(() => {

  console.log(Math.cbrt(27), Math.fround(0.1), Math.log2(8), Math.expm1(0));
})();

// 吸收 probe-m11.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.fround(5.5)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m25.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.imul(2, 3)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-m26.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Math.clz32(0)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
