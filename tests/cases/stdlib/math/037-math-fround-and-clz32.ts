// xl:title Math.fround / Math.clz32 / Math.imul 的位级结果
// xl:judge stdout
// xl:end

console.log(Math.fround(1.5), Math.fround(0.1), Math.fround(-0), 1 / Math.fround(-0));
console.log(Math.clz32(0), Math.clz32(1), Math.clz32(0xffffffff), Math.clz32(2));
console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0x7fffffff, 2), Math.imul(2, -2));
