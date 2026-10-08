// xl:title 图着色：贪心 + 回溯找最少颜色
// xl:round 371
// xl:judge stdout
// xl:end
type G = Record<string, string[]>;
function greedy(g: G): Record<string, number> {
  const color: Record<string, number> = {};
  for (const node of Object.keys(g).sort()) {
    const used = new Set<number>();
    for (const n of g[node]) if (color[n] !== undefined) used.add(color[n]);
    let c = 0;
    while (used.has(c)) c += 1;
    color[node] = c;
  }
  return color;
}
function chromatic(g: G): number {
  const nodes = Object.keys(g);
  const color: Record<string, number> = {};
  let best = nodes.length;
  const canUse = (node: string, c: number): boolean => g[node].every((n) => color[n] !== c);
  const go = (index: number, used: number): void => {
    if (used >= best) return;
    if (index === nodes.length) { best = Math.min(best, used); return; }
    const node = nodes[index];
    for (let c = 0; c < nodes.length; c++) {
      if (c > used) break;
      if (!canUse(node, c)) continue;
      color[node] = c;
      go(index + 1, Math.max(used, c + 1));
      delete color[node];
    }
  };
  go(0, 0);
  return best;
}
const triangle: G = { a: ["b", "c"], b: ["a", "c"], c: ["a", "b"] };
const path: G = { a: ["b"], b: ["a", "c"], c: ["b", "d"], d: ["c"] };
const cycle5: G = { a: ["b", "e"], b: ["a", "c"], c: ["b", "d"], d: ["c", "e"], e: ["d", "a"] };
for (const [name, g] of [["triangle", triangle], ["path", path], ["cycle5", cycle5]] as [string, G][]) {
  const colors = greedy(g);
  const groups = new Map<number, string[]>();
  for (const n of Object.keys(colors)) {
    const list = groups.get(colors[n]) ?? [];
    list.push(n);
    groups.set(colors[n], list);
  }
  console.log(name, Object.values(colors).reduce((a, b) => Math.max(a, b), -1) + 1, chromatic(g));
  console.log(" ", [...groups.entries()].sort((x, y) => x[0] - y[0]).map(([, ns]) => ns.sort().join("")).join("|"));
}
