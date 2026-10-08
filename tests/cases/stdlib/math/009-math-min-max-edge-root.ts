// xl:title Math.min / max 的边界：空参 / Infinity / NaN，与 Math.abs(-0)
// xl:judge stdout
// xl:end

console.log(Math.min(3, 1, 2), Math.max(3, 1, 2), Math.min(), Math.max());
console.log(Math.min(NaN, 1), Math.max(Infinity, 1), Math.min(-Infinity, 1));
console.log(Math.abs(-0), 1 / Math.abs(-0), Math.abs(-0) === 0);
