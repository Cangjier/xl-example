// xl:title 矩阵运算：嵌套数组 + `map` / `reduce` + 转置
// xl:round 305
// xl:judge stdout
// xl:end

type Matrix = number[][];
function transpose(m: Matrix): Matrix {
  return m[0].map((_, c) => m.map((row) => row[c]));
}
function multiply(a: Matrix, b: Matrix): Matrix {
  const bt = transpose(b);
  return a.map((row) => bt.map((col) => row.reduce((sum, v, i) => sum + v * col[i], 0)));
}
const A: Matrix = [[1, 2], [3, 4]];
const B: Matrix = [[5, 6], [7, 8]];
console.log(JSON.stringify(multiply(A, B)));
console.log(JSON.stringify(transpose(A)));
console.log(A.flat().reduce((a, b) => a + b, 0));
