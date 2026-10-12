// xl:title `Map` / `Set` 的构造与 `groupBy` / 集合运算
// xl:round 749
// xl:judge stdout
// xl:end
const m = new Map<string, number>([["a", 1], ["b", 2]]);
console.log(m.size, m.get("a"), m.has("z"), m.delete("a"), m.size);
const s = new Set<number>([1, 2, 2, 3]);
console.log(s.size, s.has(2), [...s].join(","));
console.log(JSON.stringify([...new Map([["k", "v"]])]));
const grouped = Map.groupBy([1, 2, 3, 4], (v) => (v % 2 === 0 ? "even" : "odd"));
console.log(grouped.get("even")!.join(","), grouped.get("odd")!.join(","));
try { new Map([1] as any); } catch (e) { console.log("bad entry", (e as Error).constructor.name); }
