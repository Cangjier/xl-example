// xl:title 位运算七条：`& | ^ ~ << >> >>>`
// xl:judge stdout
// xl:end

console.log(6 & 3, 6 | 3, 6 ^ 3, ~6, 1 << 4, 256 >> 4, -1 >>> 28);
console.log(5 & -1, 0xff & 0x0f, 1 << 31, (1 << 31) >> 31);
