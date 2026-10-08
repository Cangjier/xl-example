// xl:title `Map` / `Set` 的 `keys()` / `values()` / `entries()` 手动推进
// xl:round 331
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2]]);
const k = m.keys();
console.log(k.next().value, k.next().value, k.next().done);
const v = m.values();
console.log(v.next().value, v.next().value);
const e = m.entries();
console.log(e.next().value.join(":"));
const s = new Set<string>(["x", "y"]);
console.log(s.keys().next().value, s.entries().next().value.join(""));
console.log([...m.keys()].join(","));
