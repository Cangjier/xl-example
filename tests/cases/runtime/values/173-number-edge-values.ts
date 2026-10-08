// xl:title 数值边界：-0 / NaN / Infinity / 精度 / 溢出
// xl:round 371
// xl:judge stdout
// xl:end
console.log(1 / -0, Object.is(-0, 0), -0 + 0, Object.is(-0 + 0, 0));
console.log(NaN === NaN, Number.isNaN(NaN), Infinity - Infinity);
console.log(0.1 + 0.2, 1 / 3, 2 ** 53 + 1, 2 ** 53 + 1 === 2 ** 53);
console.log(Number.MAX_VALUE * 2, Number.MIN_VALUE / 2, 1e308 * 10);
console.log((0.1 + 0.2).toFixed(17));
