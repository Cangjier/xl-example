// xl:title Math.round 的 .5 与 min / max 的空实参、字符串、±0
// xl:round 291
// xl:judge stdout
// xl:end

console.log(Math.round(2.5), Math.round(-2.5), Math.round(0.5));
console.log(Math.min(), Math.max(), Math.min("2", 1), Math.max(-0, 0), Math.min(-0, 0));
console.log(Math.hypot(3, 4), Math.hypot());
