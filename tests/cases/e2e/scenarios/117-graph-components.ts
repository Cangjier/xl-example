// xl:title 图的连通分量与二部性判定
// xl:round 371
// xl:judge stdout
// xl:end
type Graph = Record<string, string[]>;
function components(g: Graph): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const start of Object.keys(g)) {
    if (seen.has(start)) continue;
    const group: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const cur = stack.pop() as string;
      group.push(cur);
      for (const next of g[cur] ?? []) {
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    out.push(group.sort());
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}
function bipartite(g: Graph): boolean {
  const color = new Map<string, number>();
  for (const start of Object.keys(g)) {
    if (color.has(start)) continue;
    color.set(start, 0);
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift() as string;
      for (const next of g[cur] ?? []) {
        if (!color.has(next)) { color.set(next, 1 - (color.get(cur) as number)); queue.push(next); }
        else if (color.get(next) === color.get(cur)) return false;
      }
    }
  }
  return true;
}
const g: Graph = { a: ["b"], b: ["a", "c"], c: ["b"], d: ["e"], e: ["d"], f: [] };
console.log(components(g).map((c) => c.join("")).join("|"));
console.log(bipartite(g));
console.log(bipartite({ a: ["b", "c"], b: ["a", "c"], c: ["a", "b"] }));
console.log(components({}).length, components({ solo: [] }).length);
