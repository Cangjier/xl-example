// xl:title 最长公共子序列与逐行 diff
// xl:round 371
// xl:judge stdout
// xl:end
function lcs(a: string[], b: string[]): string[] {
  const grid: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    const row: number[] = [];
    for (let j = 0; j <= b.length; j++) row.push(0);
    grid.push(row);
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      grid[i][j] = a[i - 1] === b[j - 1] ? grid[i - 1][j - 1] + 1 : Math.max(grid[i - 1][j], grid[i][j - 1]);
    }
  }
  const out: string[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { out.unshift(a[i - 1]); i -= 1; j -= 1; }
    else if (grid[i - 1][j] >= grid[i][j - 1]) i -= 1;
    else j -= 1;
  }
  return out;
}
function diff(oldLines: string[], newLines: string[]): string[] {
  const common = lcs(oldLines, newLines);
  const out: string[] = [];
  let oi = 0;
  let ni = 0;
  for (const line of common) {
    while (oldLines[oi] !== line) { out.push("-" + oldLines[oi]); oi += 1; }
    while (newLines[ni] !== line) { out.push("+" + newLines[ni]); ni += 1; }
    out.push(" " + line);
    oi += 1;
    ni += 1;
  }
  while (oi < oldLines.length) { out.push("-" + oldLines[oi]); oi += 1; }
  while (ni < newLines.length) { out.push("+" + newLines[ni]); ni += 1; }
  return out;
}
console.log(lcs(["a", "b", "c"], ["a", "c", "d"]).join(","));
for (const line of diff(["one", "two", "three"], ["one", "three", "four"])) console.log(line);
console.log(diff(["x"], ["x"]).length);
