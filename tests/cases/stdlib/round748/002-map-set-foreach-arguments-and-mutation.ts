// xl:title `Map` / `Set`：`forEach` 的实参次序与改动的去向
// xl:round 748
// xl:judge stdout
// xl:end
const m = new Map([["a", 1]]);
m.forEach((v, k, map) => console.log("cb", v, k, map === m, map.size));
const s = new Set(["x"]);
s.forEach((v, k, set) => console.log("scb", v, k, set === s));
let added = 0;
const s2 = new Set([1, 2]);
s2.forEach((v) => { if (v === 1) { s2.add(3); added++; } });
console.log("added", added, [...s2].join(","));
