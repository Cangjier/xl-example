// xl:title 拓扑排序 + 环检测
// xl:round 371
// xl:judge stdout
// xl:end
const deps: Record<string, string[]> = {
  app: ["lib", "ui"],
  ui: ["lib", "theme"],
  lib: ["core"],
  theme: ["core"],
  core: [],
};
function topo(graph: Record<string, string[]>): string[] | null {
  const indeg: Record<string, number> = {};
  for (const k of Object.keys(graph)) indeg[k] = indeg[k] ?? 0;
  for (const k of Object.keys(graph)) for (const d of graph[k]) indeg[d] = (indeg[d] ?? 0) + 1;
  const ready = Object.keys(indeg).filter((k) => indeg[k] === 0).sort();
  const out: string[] = [];
  while (ready.length > 0) {
    const n = ready.shift() as string;
    out.push(n);
    for (const d of graph[n]) {
      indeg[d] -= 1;
      if (indeg[d] === 0) { ready.push(d); ready.sort(); }
    }
  }
  return out.length === Object.keys(graph).length ? out : null;
}
console.log((topo(deps) ?? []).join(","));
console.log(topo({ a: ["b"], b: ["a"] }));
const layered: string[] = [];
const order = topo(deps) ?? [];
for (const name of order) layered.push(name + ":" + (deps[name] ?? []).length);
console.log(layered.join(" "));
