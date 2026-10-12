// xl:title `Object.entries` / `fromEntries` 往返与次序
// xl:round 331
// xl:judge stdout
// xl:end

const o = { b: 2, 1: "one", a: 1 };
const entries = Object.entries(o);
console.log(entries.map((p) => p[0] + "=" + p[1]).join(","));
console.log(JSON.stringify(Object.fromEntries(entries)));
console.log(Object.values(o).join(","), Object.keys(o).join(","));
