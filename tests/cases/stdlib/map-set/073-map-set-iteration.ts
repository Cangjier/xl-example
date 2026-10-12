// xl:title Map / Set 的 values / keys / entries / forEach 与插入序
// xl:round 623
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["b", 2], ["a", 1]]);
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log([...m.entries()].map(([k, v]) => k + v).join(","));
m.forEach((v, k) => console.log(k, v));
const s = new Set([3, 1, 3, 2]);
console.log([...s].join(","), [...s.entries()].map((e) => e.join(":")).join(","));
