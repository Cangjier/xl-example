// xl:title 对象数组按键排序：比较器拿到的次序与稳定性
// xl:judge stdout
// xl:end

const xs = [{ k: 2, v: "a" }, { k: 1, v: "b" }, { k: 2, v: "c" }, { k: 1, v: "d" }];
const sorted = xs.slice().sort((p, q) => p.k - q.k);
console.log(sorted.map((x) => x.v).join(""), sorted.map((x) => x.k).join(","));
console.log(xs.map((x) => x.v).join(""));
