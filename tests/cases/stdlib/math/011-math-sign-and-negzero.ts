// xl:title Math.sign / abs / min / max 在 ±0 与 NaN 上
// xl:judge stdout
// xl:end

console.log(Math.sign(-0), 1 / Math.sign(-0), Math.sign(0), Math.sign(-3), Math.sign(NaN));
console.log(1 / Math.abs(-0), 1 / Math.abs(0));
console.log(Math.min(0, -0), 1 / Math.min(0, -0), Math.max(-0, 0), 1 / Math.max(-0, 0));
console.log(Math.min(), Math.max(), Math.min(NaN, 1), Math.max(NaN, 1));
