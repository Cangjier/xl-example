// xl:title Math.clz32 / imul / fround 的组合
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0xffffffff), Math.clz32(4));
console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.fround(0.1).toFixed(10));
