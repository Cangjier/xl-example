// xl:title symbol 当 Map / Set 的键：身份而不是名字
// xl:round 678
// xl:judge stdout
// xl:end

const a = Symbol("same");
const b = Symbol("same");
const m = new Map<any, string>();
m.set(a, "A");
m.set(b, "B");
console.log(m.size, m.get(a), m.get(b));
const set = new Set<any>([a, b, a]);
console.log(set.size, set.has(a), set.has(Symbol("same")));
