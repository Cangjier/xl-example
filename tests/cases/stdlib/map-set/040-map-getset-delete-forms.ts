// xl:title Map 的增删改查与 size
// xl:round 304
// xl:judge stdout
// xl:end

const m = new Map<string, number>();
m.set("a", 1).set("b", 2);
console.log(m.size, m.get("a"), m.has("c"), m.delete("a"), m.size, m.get("a"));
m.clear();
console.log(m.size, [...m.keys()].length);
