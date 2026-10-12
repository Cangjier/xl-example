// xl:title `Map` / `Set` / `Date` 的方法在原型上（不在实例上）
// xl:round 341
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1]]);
const s = new Set<number>([1, 2]);
const d = new Date(0);
console.log(m.get === (Map.prototype as any).get, s.add === (Set.prototype as any).add,
  d.getTime === (Date.prototype as any).getTime);
console.log(typeof (Map.prototype as any).get, typeof (Set.prototype as any).has,
  typeof (Date.prototype as any).toISOString);
console.log(Object.keys(m).length, Object.keys(s).length, Object.keys(d).length);
const seen: string[] = [];
for (const k in m) seen.push(k);
for (const k in s) seen.push(k);
for (const k in d) seen.push(k);
console.log(seen.length);
console.log(m.get("a"), s.has(2), d.getTime());
m.set("b", 2); s.add(3); 
console.log(m.size, s.size, m.get("b"), s.has(3));
console.log(m instanceof Map, s instanceof Set, d instanceof Date, m instanceof Object);
const kind = Object.prototype.toString.call(m);
console.log(kind, String(m.get("a")));
