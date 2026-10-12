// xl:title Set.forEach 与两集合的并集 / 交集写法
// xl:judge stdout
// xl:end

const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);
const union = new Set([...a, ...b]);
const both = new Set([...a].filter((v) => b.has(v)));
console.log([...union].join(","), [...both].join(","));
let s = "";
a.forEach((v) => { s += v; });
console.log(s);
