// xl:title sort：默认字典序与比较器的稳定性
// xl:round 291
// xl:judge stdout
// xl:end

const rows = [{ k: 1, n: "a" }, { k: 1, n: "b" }, { k: 0, n: "c" }];
rows.sort((x, y) => x.k - y.k);
console.log(rows.map((r) => r.n).join(","));
console.log([10, 9, 1].sort().join(","), [10, 9, 1].sort((a, b) => a - b).join(","));
