// xl:title 矩阵运算：乘、转置、行列式、单位阵
// xl:round 371
// xl:judge stdout
// xl:end
type Matrix = number[][];
function zeros(r: number, c: number): Matrix {
  const out: Matrix = [];
  for (let i = 0; i < r; i++) { const row: number[] = []; for (let j = 0; j < c; j++) row.push(0); out.push(row); }
  return out;
}
function mul(a: Matrix, b: Matrix): Matrix {
  const out = zeros(a.length, b[0].length);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];
      out[i][j] = sum;
    }
  }
  return out;
}
function transpose(a: Matrix): Matrix {
  const out = zeros(a[0].length, a.length);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[0].length; j++) out[j][i] = a[i][j];
  return out;
}
function det(a: Matrix): number {
  const n = a.length;
  if (n === 1) return a[0][0];
  if (n === 2) return a[0][0] * a[1][1] - a[0][1] * a[1][0];
  let total = 0;
  for (let c = 0; c < n; c++) {
    const minor: Matrix = [];
    for (let i = 1; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) if (j !== c) row.push(a[i][j]);
      minor.push(row);
    }
    total += (c % 2 === 0 ? 1 : -1) * a[0][c] * det(minor);
  }
  return total;
}
function identity(n: number): Matrix {
  const out = zeros(n, n);
  for (let i = 0; i < n; i++) out[i][i] = 1;
  return out;
}
const a: Matrix = [[1, 2], [3, 4]];
const b: Matrix = [[5, 6], [7, 8]];
console.log(JSON.stringify(mul(a, b)));
console.log(JSON.stringify(transpose([[1, 2, 3], [4, 5, 6]])));
console.log(det(a), det(identity(3)), det([[2, 0, 1], [1, 3, 2], [1, 1, 1]]));
console.log(JSON.stringify(mul(a, identity(2))) === JSON.stringify(a));
