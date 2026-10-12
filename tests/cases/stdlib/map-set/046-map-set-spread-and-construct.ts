// xl:title Map / Set 的构造来源与展开
// xl:round 304
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1]]);
console.log([...m.keys()].join(","), [...m.values()].join(","), JSON.stringify([...m.entries()]));
const s = new Set<number>([1, 1, 2]);
console.log([...s].join(","), new Set("aab").size);
console.log(new Map(m).size, new Set(s).size);
