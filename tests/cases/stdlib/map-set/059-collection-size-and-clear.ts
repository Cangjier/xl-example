// xl:title `Map` / `Set` 的 `size` / `clear` / `delete` 返回值
// xl:round 331
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1], ["b", 2]]);
console.log(m.size, m.delete("a"), m.delete("zz"), m.size);
m.clear();
console.log(m.size, [...m.keys()].length);
const s = new Set<number>([1, 2, 3]);
console.log(s.delete(2), s.has(2), s.size);
