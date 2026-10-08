// xl:title Math.cbrt / expm1 / log1p 的取值
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Math.cbrt(27), Math.cbrt(-8), Math.expm1(0), Math.log1p(0));
console.log(Math.expm1(1).toFixed(6), Math.log1p(Math.E - 1).toFixed(6));
