// xl:title 数独校验器：行 / 列 / 宫
// xl:round 371
// xl:judge stdout
// xl:end
const board = [
  "53..7....",
  "6..195...",
  ".98....6.",
  "8...6...3",
  "4..8.3..1",
  "7...2...6",
  ".6....28.",
  "...419..5",
  "....8..79",
];
function valid(rows: string[]): { ok: boolean; why: string } {
  const check = (cells: string[], label: string): string | null => {
    const seen: Record<string, boolean> = {};
    for (const c of cells) {
      if (c === ".") continue;
      if (seen[c]) return label + ":" + c;
      seen[c] = true;
    }
    return null;
  };
  for (let r = 0; r < 9; r++) {
    const rowsProblem = check(rows[r].split(""), "row" + r);
    if (rowsProblem) return { ok: false, why: rowsProblem };
    const col: string[] = [];
    for (let c = 0; c < 9; c++) col.push(rows[c].charAt(r));
    const colProblem = check(col, "col" + r);
    if (colProblem) return { ok: false, why: colProblem };
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cells: string[] = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push(rows[br * 3 + i].charAt(bc * 3 + j));
      const problem = check(cells, "box" + br + bc);
      if (problem) return { ok: false, why: problem };
    }
  }
  return { ok: true, why: "" };
}
console.log(valid(board).ok);
const bad = board.slice();
bad[0] = "55..7....";
console.log(JSON.stringify(valid(bad)));
let filled = 0;
for (const row of board) for (const ch of row) if (ch !== ".") filled += 1;
console.log(filled, board.length, board[0].length);
