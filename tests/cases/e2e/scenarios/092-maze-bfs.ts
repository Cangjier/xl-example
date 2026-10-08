// xl:title 迷宫寻路：BFS 最短路与路径还原
// xl:round 371
// xl:judge stdout
// xl:end
const maze = [
  "S.#.....",
  ".#.#.##.",
  ".#...#..",
  "...#.#..",
  "##.#.#..",
  ".....#.E",
];
type P = { r: number; c: number };
const rows = maze.length;
const cols = maze[0].length;
function find(ch: string): P {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (maze[r].charAt(c) === ch) return { r, c };
  throw new Error("not found: " + ch);
}
function bfs(start: P, goal: P): P[] | null {
  const key = (p: P): string => p.r + "," + p.c;
  const seen: Record<string, boolean> = {};
  const prev: Record<string, string> = {};
  const queue: P[] = [start];
  seen[key(start)] = true;
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    if (cur.r === goal.r && cur.c === goal.c) {
      const path: P[] = [];
      let k: string | undefined = key(cur);
      while (k !== undefined && k !== key(start)) {
        const parts = k.split(",");
        path.unshift({ r: Number(parts[0]), c: Number(parts[1]) });
        k = prev[k];
      }
      path.unshift(start);
      return path;
    }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      if (maze[nr].charAt(nc) === "#") continue;
      const k = nr + "," + nc;
      if (seen[k]) continue;
      seen[k] = true;
      prev[k] = key(cur);
      queue.push({ r: nr, c: nc });
    }
  }
  return null;
}
const path = bfs(find("S"), find("E"));
console.log(path === null ? "none" : path.length);
console.log((path ?? []).map((p) => p.r + "" + p.c).join(" "));
console.log(bfs(find("S"), find("S"))!.length, bfs({ r: 0, c: 0 }, { r: 0, c: 2 }));
