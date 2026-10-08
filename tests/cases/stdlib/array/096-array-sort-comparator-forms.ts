// xl:title sort 的返回同一数组 / 比较器返回小数 / 稳定
// xl:round 653
// xl:judge stdout
// xl:end

const xs = [3, 1, 2];
const same = xs.sort((a, b) => a - b);
console.log(same === xs, xs.join(","));
const ys = [3, 1, 2];
console.log(ys.sort((a, b) => a / 1000 - b / 1000).join(","), ys.join(","));
const recs = [{ k: 1, t: "a" }, { k: 1, t: "b" }, { k: 0, t: "c" }];
console.log(recs.sort((a, b) => a.k - b.k).map((r) => r.t).join(","));
console.log([10, 9, 1].sort().join(","));
