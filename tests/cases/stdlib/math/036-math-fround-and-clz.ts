// xl:title Math.fround / Math.imul / Math.clz32 边界
// xl:round 647
// xl:judge stdout
// xl:end

console.log(Math.fround(0.1), Math.fround(1e300), Math.fround(-0));
console.log(Math.imul(0x7fffffff, 2), Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000));
console.log(Math.hypot(), Math.hypot(3, 4), Math.sign(-0), Object.is(Math.sign(-0), -0));
