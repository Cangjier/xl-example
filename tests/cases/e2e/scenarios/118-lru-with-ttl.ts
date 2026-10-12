// xl:title 带 TTL 的 LRU 缓存（注入时钟）
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
type Entry<V> = { value: V; expires: number };
class TtlCache<K, V> {
  private map = new Map<K, Entry<V>>();
  private now: () => number;
  constructor(private cap: number, private ttl: number, now: () => number) { this.now = now; }
  get(key: K): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expires <= this.now()) { this.map.delete(key); return undefined; }
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.cap) {
      const oldest = this.map.keys().next();
      if (!oldest.done) this.map.delete(oldest.value);
    }
    this.map.set(key, { value, expires: this.now() + this.ttl });
  }
  get size(): number { return this.map.size; }
  keys(): K[] { return [...this.map.keys()]; }
}
let clock = 0;
const cache = new TtlCache<string, number>(3, 100, () => clock);
cache.set("a", 1);
cache.set("b", 2);
cache.set("c", 3);
console.log(cache.get("a"), cache.keys().join(","));
cache.set("d", 4);
console.log(cache.keys().join(","), cache.get("b"));
clock = 50;
console.log(cache.get("a"), cache.get("d"));
clock = 200;
console.log(cache.get("d"), cache.size, cache.keys().join(","));
cache.set("e", 5);
console.log(cache.keys().join(","));
