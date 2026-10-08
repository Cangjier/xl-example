// xl:title Map / Set 的身份语义与迭代中的修改
// xl:round 371
// xl:judge stdout
// xl:end
const m = new Map<any, number>();
const key = { id: 1 };
m.set(key, 1);
m.set({ id: 1 }, 2);
console.log(m.size, m.get(key));
for (const [k, v] of m) { }
const seen: string[] = [];
m.forEach((v, k) => seen.push(String(v)));
console.log(seen.join(","), m.has(key));
const s = new Set<number>([1, 2, 3]);
for (const v of s) { if (v === 2) s.delete(3); }
console.log([...s].join(","), s.size);
