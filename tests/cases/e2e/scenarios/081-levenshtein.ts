// xl:title 编辑距离与回溯出的编辑脚本
// xl:round 371
// xl:judge stdout
// xl:end
function distance(a: string, b: string): number {
  const prev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev.push(j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost));
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}
function align(a: string, b: string): string[] {
  const grid: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    const row: number[] = [];
    for (let j = 0; j <= b.length; j++) row.push(i === 0 ? j : j === 0 ? i : 0);
    grid.push(row);
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + cost);
    }
  }
  const ops: string[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && grid[i][j] === grid[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)) {
      ops.unshift(a.charAt(i - 1) === b.charAt(j - 1) ? "=" + a.charAt(i - 1) : "~" + a.charAt(i - 1) + b.charAt(j - 1));
      i -= 1;
      j -= 1;
    } else if (i > 0 && grid[i][j] === grid[i - 1][j] + 1) { ops.unshift("-" + a.charAt(i - 1)); i -= 1; }
    else { ops.unshift("+" + b.charAt(j - 1)); j -= 1; }
  }
  return ops;
}
console.log(distance("kitten", "sitting"), distance("", "abc"), distance("same", "same"));
console.log(align("cat", "cut").join(" "));
console.log(align("abc", "yabd").join(" "));
