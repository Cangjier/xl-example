// xl:title 递归、记忆化与动态规划
// xl:round 338
// xl:judge stdout
// xl:end

function fib(n: number, memo: Map<number, number> = new Map()): number {
  if (n < 2) return n;
  const hit = memo.get(n);
  if (hit !== undefined) return hit;
  const value = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, value);
  return value;
}
console.log(fib(10), fib(30));
const grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
function paths(r: number, c: number, memo: Map<string, number> = new Map()): number {
  if (r === 0 || c === 0) return 1;
  const key = r + "," + c;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const value = paths(r - 1, c, memo) + paths(r, c - 1, memo);
  memo.set(key, value);
  return value;
}
console.log(paths(2, 2), paths(5, 5));
console.log(grid.map((row) => row.reduce((s, v) => s + v, 0)).join(","));
