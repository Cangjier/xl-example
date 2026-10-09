// xl:title 端到端：矩阵乘法与转置（二维数组 / reduce / 边界断言）
// xl:round 7
// xl:judge stdout
// xl:end

type M = number[][];
function transpose(a: M): M { return a[0].map((_, j) => a.map((row) => row[j])); }
function mul(a: M, b: M): M {
  if (a[0].length !== b.length) throw new Error("shape " + a[0].length + "x" + b.length);
  const bt = transpose(b);
  return a.map((row) => bt.map((col) => row.reduce((sum, v, i) => sum + v * col[i], 0)));
}
const A: M = [[1, 2], [3, 4], [5, 6]];
const B: M = [[7, 8, 9], [10, 11, 12]];
console.log(JSON.stringify(transpose(A)));
console.log(JSON.stringify(mul(A, B)));
console.log(JSON.stringify(mul([[1, 0], [0, 1]], [[5, 6], [7, 8]])));
try { mul(A, A); } catch (e) { console.log((e as Error).message); }
