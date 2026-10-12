// xl:title Map 的链式写、clear、delete 与 size
// xl:judge stdout
// xl:end

const m = new Map<string, number>();
m.set("a", 1).set("b", 2).set("a", 3);
console.log(m.size, m.get("a"), m.has("b"), m.delete("b"), m.size);
console.log(m.delete("zzz"));
m.clear();
console.log(m.size, m.get("a"));
