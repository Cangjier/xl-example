// xl:title LRU：Map 的重插顺序与容量淘汰
// xl:round 681
// xl:judge stdout
// xl:end
class Lru { m: Map<string, number> = new Map(); cap: number; constructor(cap: number) { this.cap = cap; } get(k: string): number { if (!this.m.has(k)) return -1; const v: any = this.m.get(k); this.m.delete(k); this.m.set(k, v); return v; } put(k: string, v: number): void { if (this.m.has(k)) this.m.delete(k); this.m.set(k, v); if (this.m.size > this.cap) this.m.delete(String(this.m.keys().next().value)); } }
const c = new Lru(2);
c.put('a', 1); c.put('b', 2); console.log(c.get('a')); c.put('c', 3);
console.log(c.get('b'), [...c.m.keys()].join(','));
