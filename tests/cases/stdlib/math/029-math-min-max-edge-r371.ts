// xl:title min / max：空实参、NaN、±0
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Math.min(), Math.max());
console.log(Math.min(1, NaN), Math.max(1, NaN), Math.min(NaN, 1));
console.log(1 / Math.min(0, -0), 1 / Math.max(-0, 0));
console.log(Math.min("2" as any, 3), Math.max(1, 2, 3));
