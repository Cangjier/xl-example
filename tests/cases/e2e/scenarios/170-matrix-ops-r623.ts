// xl:title 端到端：矩阵乘法（嵌套数组 + 循环 + 数值）
// xl:round 623
// xl:judge stdout
// xl:end

const a = [[1, 2], [3, 4]];
const b = [[5, 6], [7, 8]];
const out: number[][] = [];
for (let i = 0; i < a.length; i++) {
  const row: number[] = [];
  for (let j = 0; j < b[0].length; j++) {
    let sum = 0;
    for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];
    row.push(sum);
  }
  out.push(row);
}
console.log(JSON.stringify(out));
