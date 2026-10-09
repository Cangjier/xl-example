// xl:title `Number` / `Math` 的转换与精度边界
// xl:round 749
// xl:judge stdout
// xl:end
console.log(Number.parseInt("  42px", 10), Number.parseFloat("3.14abc"), Number.isNaN(NaN), Number.isFinite(Infinity));
console.log((255).toString(16), (8).toString(2), (0.1 + 0.2).toFixed(2), (1.005).toFixed(2));
console.log(Math.hypot(3, 4), Math.cbrt(27), Math.log2(8), Math.expm1(0));
console.log(Math.clz32(1), Math.imul(3, 4), Math.fround(1.5), Math.sign(-3));
console.log(Number.MAX_SAFE_INTEGER.toString(), Number.EPSILON > 0, (-7 % 3), (7 % -3));
console.log(Object.is(NaN, NaN), Object.is(0, -0), NaN === NaN, 0 === -0);
