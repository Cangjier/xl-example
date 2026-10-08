// xl:title Set 的去重口径：NaN 与 -0
// xl:judge stdout
// xl:end

const s = new Set<any>([NaN, NaN, 0, -0, "0", 0]);
console.log(s.size, s.has(NaN), s.has(0), s.has(-0), s.has("0"));
const t = new Set<number>([1, 2, 2, 3, 1]);
console.log([...t].join(","));
