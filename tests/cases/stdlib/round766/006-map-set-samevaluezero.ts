// xl:title `Map` / `Set` 的相等口径与迭代形状
// xl:round 766
// xl:judge stdout
// xl:note 键的相等走 **SameValueZero**：`1` 与 `"1"` 是两格、`NaN` 命中自己、
// xl:note `0` 与 `-0` 是**同一格**（`Set` 里加起来只有一格）。
// xl:note 迭代形状那一半：`keys` / `values` / `entries` 与展开的次序，
// xl:note 以及 `Map` 自己的 `JSON.stringify`（空对象——它没有可序列化的自有键）。
// xl:end
const m = new Map<any, any>([[1, "a"], ["1", "b"], [NaN, "c"]]);
console.log("01", m.size, m.get(1), m.get("1"), m.get(NaN));
const s = new Set<any>([1, "1", NaN, NaN, 0, -0]);
console.log("02", s.size, s.has(NaN), s.has(0), s.has(-0));
console.log("03", [...m.keys()].join("|"), [...s].join("|"));
console.log("04", JSON.stringify([...new Map([[1, 2]])]), JSON.stringify(m));
console.log("05", [...m.entries()].map((e) => e.join(":")).join("|"));
console.log("06", [...m.values()].join("|"), [...s.values()].join("|"));
const g = new Map<number, number>();
for (let i = 0; i < 12; i++) g.set(i, i * i);
console.log("07", g.size, g.get(11));
console.log("done");
