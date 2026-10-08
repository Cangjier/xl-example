// xl:title Map：size / has / get / delete / clear 与缺失键
// xl:judge stdout
// xl:end

const m = new Map<string, number>();
console.log(m.size, m.get("x"), m.has("x"), m.delete("x"));
m.set("a", 1).set("b", 2);
console.log(m.size, m.get("a"), m.delete("a"), m.size);
m.clear();
console.log(m.size, m.get("b"));
