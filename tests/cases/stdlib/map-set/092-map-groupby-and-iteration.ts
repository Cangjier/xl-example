// xl:title Map：构造入参、groupBy、边迭代边删
// xl:round 9
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2]]);
console.log([...m.keys()].join(","), [...m.values()].join(","));
const g = Map.groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd"));
console.log(g.get("even")!.join(","), g.get("odd")!.join(","));
for (const [k, v] of m) { if (k === "a") m.delete(k); }
console.log(m.size);
