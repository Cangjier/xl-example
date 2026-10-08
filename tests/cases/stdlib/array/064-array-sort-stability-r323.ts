// xl:title sort 的稳定性：相等元素保持原序
// xl:round 323
// xl:judge stdout
// xl:end

const rows = [{ k: 1, i: "a" }, { k: 0, i: "b" }, { k: 1, i: "c" }, { k: 0, i: "d" }];
console.log(rows.sort((p, q) => p.k - q.k).map((r) => r.i).join(""));
console.log([10, 9, 1, 2].sort().join(","));
