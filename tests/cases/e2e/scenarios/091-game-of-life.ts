// xl:title 生命游戏：三代演化与统计
// xl:round 371
// xl:judge stdout
// xl:end
const rows = 6;
const cols = 6;
let grid: number[][] = [];
for (let r = 0; r < rows; r++) {
  const row: number[] = [];
  for (let c = 0; c < cols; c++) row.push(0);
  grid.push(row);
}
for (const [r, c] of [[1, 2], [2, 3], [3, 1], [3, 2], [3, 3]]) grid[r][c] = 1;
function step(g: number[][]): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      let live = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          live += g[nr][nc];
        }
      }
      row.push(g[r][c] === 1 ? (live === 2 || live === 3 ? 1 : 0) : live === 3 ? 1 : 0);
    }
    out.push(row);
  }
  return out;
}
const render = (g: number[][]): string => g.map((row) => row.map((v) => (v ? "#" : ".")).join("")).join("/");
for (let i = 0; i < 3; i++) {
  console.log(render(grid));
  grid = step(grid);
}
let alive = 0;
for (const row of grid) for (const v of row) alive += v;
console.log("alive", alive, render(grid).length);
