// xl:title 带指标的缓存：命中率、逐出、预热
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Cache<K, V> {
  private map = new Map<K, V>();
  hits = 0;
  misses = 0;
  evictions = 0;
  constructor(private cap: number) {}
  get(key: K): V | undefined {
    if (!this.map.has(key)) { this.misses += 1; return undefined; }
    this.hits += 1;
    const v = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.cap) { this.evictions += 1; this.map.delete(this.map.keys().next().value as K); }
    this.map.set(key, value);
  }
  get hitRate(): string { const total = this.hits + this.misses; return total === 0 ? "n/a" : ((this.hits / total) * 100).toFixed(1) + "%"; }
}
const cache = new Cache<string, number>(2);
const accesses = ["a", "b", "a", "c", "a", "b", "c", "c"];
const out: string[] = [];
for (const key of accesses) {
  const hit = cache.get(key);
  if (hit === undefined) { cache.set(key, key.charCodeAt(0)); out.push("M" + key); }
  else out.push("H" + key);
}
console.log(out.join(" "));
console.log(cache.hits, cache.misses, cache.evictions, cache.hitRate);
const prewarm = new Cache<number, number>(3);
for (let i = 0; i < 3; i++) prewarm.set(i, i * i);
console.log([0, 1, 2, 5].map((k) => prewarm.get(k) ?? "-").join(","), prewarm.hitRate);
