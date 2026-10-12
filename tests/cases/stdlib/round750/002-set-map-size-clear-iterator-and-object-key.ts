// xl:title `Set` / `Map` 的 `size` / `clear` / 迭代器的 `next` 形状
// xl:round 750
// xl:judge stdout
// xl:end
const s = new Set([1, 2, 3]);
const it = s.values();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
s.clear();
console.log(s.size, [...s].length, s.has(1));
const m = new Map([["a", 1]]);
const mk = m.keys();
console.log(JSON.stringify(mk.next()), JSON.stringify(mk.next()));
console.log(m.size, [...m.entries()].length, [...m.values()].join(","));
const t: any = {};
t[s] = "x";
console.log(Object.keys(t).length, t[s], t[String(s)]);
