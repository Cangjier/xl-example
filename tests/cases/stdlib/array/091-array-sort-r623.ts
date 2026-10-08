// xl:title Array.sort 的比较器与稳定性
// xl:round 623
// xl:judge stdout
// xl:end

console.log([10, 9, 1].sort().join(","));
console.log([10, 9, 1].sort((x, y) => x - y).join(","));
const rows = [{ k: 1, v: "a" }, { k: 0, v: "b" }, { k: 1, v: "c" }];
console.log(rows.sort((x, y) => x.k - y.k).map((r) => r.v).join(""));
console.log(["b", "a"].sort().join(","));
