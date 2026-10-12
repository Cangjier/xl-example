// xl:title 集合互相复制：new Map(map) / new Set(set)
// xl:round 291
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2]]);
const m2 = new Map(m);
console.log(m2.size, m2.get("b"));
const s = new Set([1, 2, 3]);
const s2 = new Set(s);
console.log(s2.size, [...s2].join(","));
