// xl:title 移位与掩码：负数、超宽位移、无符号右移
// xl:round 304
// xl:judge stdout
// xl:end

console.log(-8 >> 2, -8 >>> 2, 1 << 31, 1 << 32, 1 << 33);
console.log(0xffffffff | 0, 0xffffffff >>> 0, ~5, 5 & 3, 5 | 3, 5 ^ 3);
