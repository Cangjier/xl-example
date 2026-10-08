// xl:title 矩阵乘法：嵌套数组 + 循环 + reduce
// xl:round 682
// xl:judge stdout
// xl:end
const a = [[1, 2], [3, 4]];
const b = [[5, 6], [7, 8]];
const out: any = [];
for (let i = 0; i < a.length; i++) { const row: any = []; for (let j = 0; j < b[0].length; j++) { let sum = 0; for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j]; row.push(sum); } out.push(row); }
console.log(out.map((r: any) => r.join(',')).join('|'));
