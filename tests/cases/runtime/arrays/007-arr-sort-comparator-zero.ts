// xl:title `sort` 的比较器返回 0 / 默认按文本排
// xl:judge stdout
// xl:end

const xs = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 0, n: "c" }];
console.log(xs.slice().sort((p, q) => p.k - q.k).map((p) => p.n).join(""));
const words = ["pear", "Apple", "fig"];
console.log(words.slice().sort().join(","));
