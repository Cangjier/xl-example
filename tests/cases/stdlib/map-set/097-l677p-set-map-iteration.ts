// xl:title 点名：Set / Map 的迭代、去重、size、forEach 与键顺序
// xl:judge stdout
// xl:end

const s = new Set([3, 1, 3, 2]);
console.log(s.size, [...s].join(","), [...s.values()].join(","), [...s.keys()].join(","));
s.add(4).delete(1);
const sseen = [];
s.forEach((v, k) => sseen.push(String(v) + String(k)));
console.log(sseen.join(" "), [...s.entries()].map(([a, b]) => String(a) + String(b)).join(","));
const m = new Map([["b", 2], ["a", 1]]);
console.log(m.size, [...m.keys()].join(","), [...m.values()].join(","), m.get("a"), m.get("zz"));
m.set("c", 3);
const mseen = [];
m.forEach((v, k) => mseen.push(k + String(v)));
console.log(mseen.join(" "), [...m.entries()].length, m.has("c"), m.has("zz"));
const withNaN = new Set([NaN, NaN]);
console.log(withNaN.size, withNaN.has(NaN), new Map([[NaN, 1]]).get(NaN));
