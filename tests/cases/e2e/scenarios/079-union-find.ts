// xl:title 并查集：连通分量与环检测
// xl:round 371
// xl:judge stdout
// xl:end
class DSU {
  private parent: number[] = [];
  private rank: number[] = [];
  constructor(n: number) { for (let i = 0; i < n; i++) { this.parent.push(i); this.rank.push(0); } }
  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    let cur = x;
    while (this.parent[cur] !== root) { const next = this.parent[cur]; this.parent[cur] = root; cur = next; }
    return root;
  }
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else { this.parent[rb] = ra; this.rank[ra] += 1; }
    return true;
  }
}
const dsu = new DSU(6);
const edges: [number, number][] = [[0, 1], [1, 2], [3, 4], [2, 0]];
const results = edges.map(([a, b]) => dsu.union(a, b));
console.log(results.join(","));
const groups = new Map<number, number[]>();
for (let i = 0; i < 6; i++) {
  const root = dsu.find(i);
  const list = groups.get(root) ?? [];
  list.push(i);
  groups.set(root, list);
}
console.log([...groups.values()].map((g) => g.join("")).join("|"), groups.size);
