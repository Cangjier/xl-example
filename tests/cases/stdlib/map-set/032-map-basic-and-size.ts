// xl:title Map 的链式 set 与 size / get / has / delete
// xl:round 291
// xl:judge stdout
// xl:end

const m = new Map<string, number>();
m.set("a", 1).set("b", 2);
console.log(m.size, m.get("a"), m.has("z"), m.delete("a"), m.size);
console.log(m.get("b"), [...m.keys()].join(","));
