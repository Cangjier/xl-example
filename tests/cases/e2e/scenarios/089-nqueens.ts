// xl:title N 皇后：解的个数与第一种解
// xl:round 371
// xl:judge stdout
// xl:end
function solve(n: number): { count: number; first: number[][] } {
  const cols: number[] = [];
  const used: boolean[] = [];
  const diag1: boolean[] = [];
  const diag2: boolean[] = [];
  for (let i = 0; i < n; i++) used.push(false);
  for (let i = 0; i < 2 * n; i++) { diag1.push(false); diag2.push(false); }
  let count = 0;
  const first: number[][] = [];
  const place = (row: number): void => {
    if (row === n) {
      count += 1;
      if (first.length === 0) first.push(cols.slice());
      return;
    }
    for (let c = 0; c < n; c++) {
      if (used[c] || diag1[row + c] || diag2[row - c + n]) continue;
      used[c] = true;
      diag1[row + c] = true;
      diag2[row - c + n] = true;
      cols.push(c);
      place(row + 1);
      cols.pop();
      used[c] = false;
      diag1[row + c] = false;
      diag2[row - c + n] = false;
    }
  };
  place(0);
  return { count, first };
}
for (const n of [4, 5, 6]) {
  const r = solve(n);
  console.log(n, r.count, r.first[0].join(","));
}
console.log(solve(8).count);
