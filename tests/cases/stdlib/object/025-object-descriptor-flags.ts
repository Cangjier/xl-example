// xl:title getOwnPropertyDescriptor 的三套标志（数组元素 / 字符串下标 / length）
// xl:judge stdout
// xl:end

const d1 = Object.getOwnPropertyDescriptor([1, 2], "0") as any;
const d2 = Object.getOwnPropertyDescriptor("ab", "0") as any;
const d3 = Object.getOwnPropertyDescriptor([1, 2], "length") as any;
console.log([d1.writable, d1.enumerable, d1.configurable].join(","));
console.log([d2.writable, d2.enumerable, d2.configurable].join(","));
console.log([d3.writable, d3.enumerable, d3.configurable].join(","));
