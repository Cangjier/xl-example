// xl:title pow / sqrt / cbrt / hypot 的边界
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Math.pow(2, 10), Math.pow(2, -1), Math.pow(-8, 1 / 3), Math.pow(1, Infinity));
console.log(Math.sqrt(9), Math.sqrt(-1), 1 / Math.sqrt(0));
console.log(Math.cbrt(27), Math.cbrt(-8), Math.hypot(3, 4), Math.hypot());
console.log(Math.pow(NaN, 0), Math.pow(0, -1) === Infinity);
