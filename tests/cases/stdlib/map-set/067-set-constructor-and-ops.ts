// xl:title Set：去重、NaN / ±0、迭代序、has 的返回值
// xl:round 371
// xl:judge stdout
// xl:end
const s = new Set<any>([1, 1, "1", NaN, NaN, -0, 0, null, undefined]);
console.log(s.size, [...s].map((v) => String(v)).join(","));
console.log(s.has(NaN), s.has(0), s.has(-0), s.has("1"));
const t = new Set("aabbc");
console.log([...t].join(""), t.size);
console.log(new Set([[1], [1]]).size);
