// xl:title Map / Set 与数组、对象之间的转换
// xl:round 371
// xl:judge stdout
// xl:end
const entries: [string, number][] = [["a", 1], ["b", 2]];
const m = new Map(entries);
console.log(JSON.stringify([...m]), JSON.stringify(Object.fromEntries(m)));
const back = new Map(Object.entries(Object.fromEntries(m)));
console.log(back.size, back.get("a"));
const s = new Set([1, 2, 3]);
console.log([...s].map((v) => v * 2).join(","), new Set([...s].filter((v) => v > 1)).size);
console.log(Array.from(s).reduce((a, b) => a + b, 0), new Set("aabb").size);
