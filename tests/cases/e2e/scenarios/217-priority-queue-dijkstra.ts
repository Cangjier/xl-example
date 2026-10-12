// xl:title 二叉堆优先队列 + Dijkstra 最短路
// xl:round 8
// xl:judge stdout
// xl:end

class Heap {
  constructor() { this.a = []; }
  push(node) { const a = this.a; a.push(node); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; const t = a[p]; a[p] = a[i]; a[i] = t; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length > 0) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let s = i; if (l < a.length && a[l][0] < a[s][0]) s = l; if (r < a.length && a[r][0] < a[s][0]) s = r; if (s === i) break; const t = a[s]; a[s] = a[i]; a[i] = t; i = s; } } return top; }
  get size() { return this.a.length; }
}
const graph = { A: [["B", 1], ["C", 4]], B: [["C", 2], ["D", 5]], C: [["D", 1]], D: [] };
function dijkstra(from) {
  const dist = new Map([[from, 0]]);
  const heap = new Heap();
  heap.push([0, from]);
  while (heap.size > 0) {
    const [d, node] = heap.pop();
    if (d > (dist.get(node) ?? Infinity)) continue;
    for (const [next, w] of graph[node]) {
      const nd = d + w;
      if (nd < (dist.get(next) ?? Infinity)) { dist.set(next, nd); heap.push([nd, next]); }
    }
  }
  return dist;
}
const dist = dijkstra("A");
console.log([...dist.keys()].sort().map((k) => k + "=" + dist.get(k)).join(" "));
