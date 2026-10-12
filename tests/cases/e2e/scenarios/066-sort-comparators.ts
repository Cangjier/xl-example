// xl:title `sort` 的比较器与稳定性
// xl:round 338
// xl:judge stdout
// xl:end

const rows = [
  { k: "b", v: 2 }, { k: "a", v: 1 }, { k: "c", v: 2 }, { k: "d", v: 1 },
];
const byV = rows.slice().sort((x, y) => x.v - y.v);
console.log(byV.map((r) => r.k + r.v).join(","));
const byK = rows.slice().sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : 0));
console.log(byK.map((r) => r.k).join(""));
console.log([10, 9, 100, 1].sort().join(","), [10, 9, 100, 1].sort((x, y) => x - y).join(","));
console.log([3, 1, 2].sort().reverse().join(","));
const words = ["pear", "apple", "fig"];
console.log(words.sort().join(","), words.join(","));
