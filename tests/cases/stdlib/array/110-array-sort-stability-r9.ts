// xl:title Array.prototype.sort：默认字典序、稳定性、比较器
// xl:round 9
// xl:judge stdout
// xl:end

console.log([10, 9, 1].sort().join(","));
const items = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 1, n: "c" }];
items.sort((x, y) => x.k - y.k);
console.log(items.map((i) => i.n).join(""));
const mixed = [3, 1, 2];
console.log(mixed.sort().join(","), mixed.join(","));
