// xl:title 端到端：LRU 缓存（Map 的插入序 + 命中重排 + 统计）
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Lru<K, V> {
  private m = new Map<K, V>();
  hits = 0;
  misses = 0;
  constructor(private cap: number) {}
  get(k: K): V | undefined {
    if (!this.m.has(k)) { this.misses++; return undefined; }
    this.hits++;
    const v = this.m.get(k) as V;
    this.m.delete(k);
    this.m.set(k, v);
    return v;
  }
  put(k: K, v: V): void {
    if (this.m.has(k)) this.m.delete(k);
    this.m.set(k, v);
    if (this.m.size > this.cap) this.m.delete(this.m.keys().next().value as K);
  }
  keys(): string { return [...this.m.keys()].join(","); }
}
const c = new Lru<string, number>(3);
for (const k of ["a", "b", "c"]) c.put(k, k.length);
console.log(c.keys(), c.get("a"), c.keys(), c.get("zz"));
c.put("d", 4);
console.log(c.keys(), c.hits, c.misses);
c.put("b", 9);
console.log(c.keys(), c.get("b"), c.keys());
