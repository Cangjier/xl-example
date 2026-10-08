// xl:title 位运算走 32 位有符号
// xl:round 691
// xl:judge stdout
// xl:end
console.log(2147483647 | 0, (2147483648 | 0), (-1 >>> 0));
console.log(1 << 31, (1 << 31) >> 31, 5 & 3, 5 ^ 3, ~5);
console.log(1.9 | 0, (-1.9) | 0);
