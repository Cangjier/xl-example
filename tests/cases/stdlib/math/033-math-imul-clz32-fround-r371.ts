// xl:title imul / clz32 / fround / sign / trunc 的 32 位口径
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Math.imul(3, 4), Math.imul(-5, 12), Math.imul(0x7fffffff, 2));
console.log(Math.clz32(1), Math.clz32(0), Math.clz32(0x80000000), Math.clz32(-1));
console.log(Math.fround(1.5), Math.fround(0.1), Math.fround(1e40));
console.log(Math.sign(-3), Math.sign(0), Math.sign(-0), Math.sign(NaN));
console.log(Math.trunc(4.9), Math.trunc(-4.9));
