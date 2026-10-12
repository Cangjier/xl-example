// xl:title 位运算在负数上：& | ^ << >> >>>
// xl:judge stdout
// xl:end

console.log(-1 & 0xff, -8 >> 1, -8 >>> 28, 1 << 31, (-1 >>> 0) === 4294967295);
console.log(5 ^ 3, ~0, ~5, 0x7fffffff | 0, (1 << 31) | 0);
console.log(3.9 | 0, -3.9 | 0, NaN | 0, Infinity | 0);
