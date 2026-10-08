// xl:title Math 边角：clz32 / imul / fround / hypot / cbrt / sign / trunc / log2
// xl:round 623
// xl:judge stdout
// xl:end

console.log(Math.clz32(1), Math.imul(3, 4), Math.fround(1.5), Math.hypot(3, 4));
console.log(Math.cbrt(27), Math.sign(-0), Math.trunc(-1.7), Math.log2(8), Math.log10(1000));
console.log(Math.min(), Math.max(), Math.min(1, NaN));
