// xl:title Map：set / get / has / delete / size / 覆盖写
// xl:judge stdout
// xl:end

const m = new Map<string, number>();
m.set("a", 1).set("b", 2);
console.log(m.get("a"), m.get("z"), m.has("a"), m.size);
m.set("a", 9);
console.log(m.get("a"), m.delete("a"), m.delete("a"), m.size);
