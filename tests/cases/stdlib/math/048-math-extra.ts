// xl:title `Math` 的 `hypot` / `clz32` / `imul` / `fround`
// xl:round 691
// xl:judge stdout
// xl:end
console.log(Math.hypot(3, 4), Math.hypot());
console.log(Math.clz32(1), Math.clz32(0), Math.imul(3, 4));
console.log(Math.fround(0.1), Math.fround(1e300));
