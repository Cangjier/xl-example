// xl:title 位运算的 32 位截断与无符号右移
// xl:round 623
// xl:judge stdout
// xl:end

console.log(2147483648 | 0, -1 >>> 0, 1 << 31, (1 << 31) >>> 0);
console.log(5 & 3, 5 | 3, 5 ^ 3, ~0, 1.9 | 0, "3" | 0, NaN | 0);
