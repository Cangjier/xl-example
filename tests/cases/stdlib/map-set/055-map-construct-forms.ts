// xl:title `Map` 的构造、覆盖与迭代次序
// xl:round 330
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["b", 2], ["a", 1], ["b", 3]]);
console.log(m.size, m.get("b"));
m.set("c", 4);
m.delete("a");
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log([...m.entries()].map(([k, v]) => k + v).join("|"));
