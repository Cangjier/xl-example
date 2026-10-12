// xl:title 二维数据：嵌套循环 / Math / 归约 / 类型化函数
// xl:judge stdout
// xl:end

const grid: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const flat = grid.reduce((acc, row) => acc.concat(row), [] as number[]);
const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
const max = Math.max(...flat);
const variance = flat.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / flat.length;
console.log("sum", flat.reduce((a, b) => a + b, 0), "mean", mean, "max", max);
console.log("variance", variance, "std", Math.sqrt(variance).toFixed(4));
const diagonal = grid.map((row, i) => row[i]);
console.log("diagonal", diagonal.join(","));
