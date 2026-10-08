// xl:title LRU 缓存（Map 的插入序当淘汰序）
// xl:round 8
// xl:judge stdout
// xl:end

class Lru {
  constructor(cap) { this.cap = cap; this.map = new Map(); }
  get(k) { if (!this.map.has(k)) return -1; const v = this.map.get(k); this.map.delete(k); this.map.set(k, v); return v; }
  put(k, v) { if (this.map.has(k)) this.map.delete(k); this.map.set(k, v); if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value); }
}
const lru = new Lru(2);
lru.put(1, 1); lru.put(2, 2);
console.log(lru.get(1));
lru.put(3, 3);
console.log(lru.get(2), lru.get(3), [...lru.map.keys()].join(","));
