// xl:title Math.min / max：-0 与 0 的取舍、NaN 传染、空实参
// xl:judge stdout
// xl:end

console.log(Math.min(0, -0), 1 / Math.min(0, -0), Math.max(0, -0), 1 / Math.max(0, -0));
console.log(Math.min(NaN, 1), Math.max(NaN, 1), Math.min(), Math.max());
console.log(Math.min(1, 2, 3), Math.max(-1, -2));
