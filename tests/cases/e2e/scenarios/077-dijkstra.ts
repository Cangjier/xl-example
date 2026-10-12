// xl:title Dijkstra 最短路：邻接表 + 朴素选点
// xl:round 371
// xl:judge stdout
// xl:end
type Edge = { to: string; w: number };
const graph: Record<string, Edge[]> = {
  A: [{ to: "B", w: 1 }, { to: "C", w: 4 }],
  B: [{ to: "C", w: 2 }, { to: "D", w: 5 }],
  C: [{ to: "D", w: 1 }],
  D: [{ to: "E", w: 3 }],
  E: [],
};
function shortest(start: string, goal: string): { dist: number; path: string[] } {
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const done: Record<string, boolean> = {};
  for (const k of Object.keys(graph)) { dist[k] = Infinity; prev[k] = null; }
  dist[start] = 0;
  for (;;) {
    let best: string | null = null;
    for (const k of Object.keys(dist)) {
      if (!done[k] && (best === null || dist[k] < dist[best])) best = k;
    }
    if (best === null || dist[best] === Infinity) break;
    done[best] = true;
    if (best === goal) break;
    for (const e of graph[best]) {
      const nd = dist[best] + e.w;
      if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = best; }
    }
  }
  const path: string[] = [];
  let cur: string | null = goal;
  while (cur !== null) { path.unshift(cur); cur = prev[cur]; }
  return { dist: dist[goal], path };
}
const r = shortest("A", "E");
console.log(r.path.join("->"), r.dist);
console.log(JSON.stringify(shortest("A", "D").path), shortest("C", "A").dist);
