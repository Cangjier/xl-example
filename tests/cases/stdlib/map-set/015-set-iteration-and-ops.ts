// xl:title Set 的遍历、交集手写、与数组互转
// xl:judge stdout
// xl:end

const s = new Set<number>([3, 1, 2, 3]);
console.log([...s].join(","), s.size, s.has(2), s.delete(1), s.size);
const other = new Set<number>([2, 5]);
console.log([...s].filter((v) => other.has(v)).join(","));
console.log([...s].map((v) => v * 2).join(","), Array.from(s).length);
