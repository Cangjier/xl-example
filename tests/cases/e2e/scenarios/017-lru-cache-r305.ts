// xl:title LRU 缓存：`Map` 的插入序 + 泛型 + 私有字段
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Lru<K, V> {
  #map = new Map<K, V>();
  constructor(private cap: number) {}
  get(k: K): V | undefined {
    if (!this.#map.has(k)) return undefined;
    const v = this.#map.get(k) as V;
    this.#map.delete(k);
    this.#map.set(k, v);
    return v;
  }
  set(k: K, v: V): void {
    if (this.#map.has(k)) this.#map.delete(k);
    this.#map.set(k, v);
    if (this.#map.size > this.cap) {
      const oldest = this.#map.keys().next().value as K;
      this.#map.delete(oldest);
    }
  }
  keys(): string { return [...this.#map.keys()].join(","); }
}
const c = new Lru<string, number>(2);
c.set("a", 1); c.set("b", 2);
console.log(c.get("a"), c.keys());
c.set("c", 3);
console.log(c.keys(), c.get("b"));
