// xl:title 点名：Math 的 cbrt / fround / clz32 / imul / sign / hypot / log2 / expm1 / log1p
// xl:judge stdout
// xl:end

console.log(Math.cbrt(27), Math.cbrt(-8), Math.fround(1.1), Math.clz32(1), Math.clz32(0), Math.imul(3, 4));
console.log(Math.sign(-3), Math.sign(0), Math.sign(-0), Object.is(Math.sign(-0), -0), Math.sign(NaN));
console.log(Math.hypot(3, 4), Math.hypot(), Math.hypot(3, 4, 12));
console.log(Math.log2(8), Math.log10(1000), Math.log1p(0), Math.expm1(0));
console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0), Math.asinh(0), Math.acosh(1), Math.atanh(0));
console.log(Math.trunc(-4.7), Math.trunc(4.7), Math.floor(-0.5), Math.ceil(-0.5), Math.round(-0.5));
console.log(Math.min(), Math.max(), Math.min(1, NaN), Math.max(-0, 0), Object.is(Math.max(-0, 0), 0));
