// xl:title 位运算的 32 位口径与移位计数
// xl:round 371
// xl:judge stdout
// xl:end
console.log(5 & 3, 5 | 3, 5 ^ 3, ~5, ~0);
console.log(1 << 31, (1 << 31) >>> 0, -1 >>> 0, -1 >> 1);
console.log(1 << 32, 1 << 33, 1 << -1, 1 >>> 32);
console.log(0x7fffffff + 1, (0x7fffffff + 1) | 0, 2 ** 31 | 0);
console.log(1.9 | 0, -1.9 | 0, NaN | 0, Infinity | 0);
