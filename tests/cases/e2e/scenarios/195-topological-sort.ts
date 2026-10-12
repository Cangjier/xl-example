// xl:title 端到端：依赖拓扑排序（Set 去重 + 环检测 + 稳定输出）
// xl:round 7
// xl:judge stdout
// xl:end

function topo(graph: Map<string, string[]>): string[] {
  const indeg = new Map<string, number>();
  const nodes = new Set<string>([...graph.keys()]);
  for (const deps of graph.values()) for (const d of deps) nodes.add(d);
  for (const n of nodes) indeg.set(n, 0);
  for (const [n, deps] of graph) for (const d of deps) indeg.set(d, (indeg.get(d) ?? 0) + 1);
  const ready = [...nodes].filter((n) => indeg.get(n) === 0).sort();
  const out: string[] = [];
  while (ready.length > 0) {
    const n = ready.shift() as string;
    out.push(n);
    for (const [m, deps] of graph) {
      if (!deps.includes(n)) continue;
      indeg.set(m, (indeg.get(m) as number) - 1);
      if (indeg.get(m) === 0) { ready.push(m); ready.sort(); }
    }
  }
  return out;
}
function topoOf(graph: Map<string, string[]>): string {
  const sorted = topo(graph);
  return sorted.length === new Set(graph.keys()).size ? sorted.join(" ") : "cycle";
}
const g = new Map<string, string[]>([["app", ["ui", "core"]], ["ui", ["core", "theme"]], ["core", []], ["theme", []]]);
console.log(topoOf(g), topo(g).length);
const bad = new Map<string, string[]>([["a", ["b"]], ["b", ["a"]]]);
console.log(topoOf(bad), topo(bad).length);
console.log(topoOf(new Map([["x", []]])));
