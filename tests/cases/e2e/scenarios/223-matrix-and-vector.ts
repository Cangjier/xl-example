// xl:title 完整程序：矩阵乘 + 向量点积（嵌套循环 / 数组 / 数值）
// xl:round 9
// xl:judge stdout
// xl:end

function multiply(a: number[][], b: number[][]): number[][] {
  const n = a.length, m = b[0].length, k = b.length;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < m; j++) {
      let s = 0;
      for (let t = 0; t < k; t++) s += a[i][t] * b[t][j];
      row.push(s);
    }
    out.push(row);
  }
  return out;
}
const A = [[1, 2], [3, 4]];
const B = [[5, 6], [7, 8]];
console.log(JSON.stringify(multiply(A, B)));
console.log(A[0].reduce((p, c, i) => p + c * B[i][0], 0));
