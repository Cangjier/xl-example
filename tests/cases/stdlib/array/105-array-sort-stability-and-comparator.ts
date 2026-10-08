// xl:title Array.prototype.sort 的稳定性与比较器返回值语义
// xl:round 8
// xl:judge stdout
// xl:end

const rows = [{ k: 2, i: 0 }, { k: 1, i: 1 }, { k: 2, i: 2 }, { k: 1, i: 3 }];
rows.sort((a, b) => a.k - b.k);
console.log(rows.map((r) => r.i).join(","));
console.log([10, 9, 100].sort().join(","));
console.log([10, 9, 100].sort((a, b) => a - b).join(","));
