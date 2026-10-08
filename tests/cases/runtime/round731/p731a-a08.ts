// xl:title 对象方法 / 访问器 / 计算键那几档的 `name`
// xl:round 731
// xl:judge stdout
// xl:end
const o = { m(a: number) {}, get g() { return 1; }, ["c"]() {} };
console.log(o.m.name, o.g.name, (o as any).c.name);
const s = Symbol("k");
const p = { [s](a: number) {} };
console.log(p[s].name === "k", typeof p[s].name);
