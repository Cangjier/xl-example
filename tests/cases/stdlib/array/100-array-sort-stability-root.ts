// xl:title Array.sort：比较器取返回值符号、稳定排序保留相等项的原序
// xl:judge stdout
// xl:end

const xs = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 1, n: "c" }, { k: 0, n: "d" }];
console.log(xs.sort((x, y) => x.k - y.k).map((x) => x.n).join(""));
const ys = [3, 1, 2];
console.log(ys.sort().join(","), ys.sort((a, b) => b - a).join(","));
console.log([10, 9, 1].sort().join(","), [10, 9, 1].sort((a, b) => a - b).join(","));
