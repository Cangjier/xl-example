// xl:title 符号当 Map 的键：每次 for 都是新键
// xl:round 304
// xl:judge stdout
// xl:end

const a = Symbol("k");
const b = Symbol("k");
const m = new Map<any, number>();
m.set(a, 1);
m.set(b, 2);
m.set("a", 3);
console.log(m.size, m.get(a), m.get(b), m.get("a"));
