// xl:title Map / Set 的迭代器与回调形态
// xl:round 7
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2]]);
console.log([...m].map(([k, v]) => k + v).join(","));
console.log([...m.keys()].join(","), [...m.values()].join(","));
m.forEach((v, k, owner) => console.log(k, v, owner === m));
const s = new Set([3, 1, 3, 2]);
console.log([...s].join(","), s.size, s.has(3), s.delete(3), s.size);
console.log([...s.entries()].map(([a, b]) => a + "=" + b).join(","));
