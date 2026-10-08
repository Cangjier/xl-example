// xl:title 点名：Object.keys / values / entries 与 for...in 的顺序和形参个数
// xl:judge stdout
// xl:end

const o = { b: 1, a: 2, 0: 3 };
console.log(Object.keys(o).join(","), Object.values(o).join(","));
for (const [k, v] of Object.entries(o)) console.log(k, v);
const seen = [];
for (const k in o) seen.push(k);
console.log(seen.join(","));
console.log(Object.entries({}).length, Object.keys("ab").join(","), Object.entries("ab").length);
