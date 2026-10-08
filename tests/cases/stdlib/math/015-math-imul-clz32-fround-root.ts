// xl:title Math.imul / clz32 / fround 的整数口径
// xl:judge stdout
// xl:end

console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0xffffffff, 5));
console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000));
console.log(Math.fround(1.5), Math.fround(0.1), Math.fround(1e40));
