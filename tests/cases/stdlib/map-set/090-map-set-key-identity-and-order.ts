// xl:title Map / Set 的键同一性、插入序与 forEach 参数
// xl:round 8
// xl:judge stdout
// xl:end

const m = new Map();
const k1 = { id: 1 };
m.set(k1, "a").set({ id: 1 }, "b").set(NaN, "nan");
console.log(m.size, m.get(k1), m.get(NaN));
const seen = [];
m.forEach((value, key, map) => seen.push([typeof key === "object" ? key.id : String(key), value, map === m]));
console.log(JSON.stringify(seen));
const s = new Set([3, 1, 3, 2]);
console.log([...s].join(","), s.size, s.has(3));
