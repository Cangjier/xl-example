// xl:title Math.pow / sqrt / cbrt / hypot 的边界
// xl:judge stdout
// xl:end

console.log(Math.pow(2, 10), Math.pow(2, 0.5), Math.pow(-8, 1 / 3), Math.pow(0, 0));
console.log(Math.sqrt(9), Math.sqrt(-1) !== Math.sqrt(-1), Math.sqrt(0));
console.log(Math.cbrt(-27), Math.cbrt(8), Math.hypot(3, 4), Math.hypot());
