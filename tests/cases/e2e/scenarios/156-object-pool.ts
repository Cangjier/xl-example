// xl:title 对象池：借用、归还、上限与统计
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Pool<T> {
  private free: T[] = [];
  private inUse = new Set<T>();
  private created = 0;
  constructor(private factory: () => T, private max: number) {}
  acquire(): T | null {
    const recycled = this.free.pop();
    if (recycled !== undefined) { this.inUse.add(recycled); return recycled; }
    if (this.created >= this.max) return null;
    const made = this.factory();
    this.created += 1;
    this.inUse.add(made);
    return made;
  }
  release(item: T): boolean {
    if (!this.inUse.has(item)) return false;
    this.inUse.delete(item);
    this.free.push(item);
    return true;
  }
  get stats(): { created: number; free: number; inUse: number } {
    return { created: this.created, free: this.free.length, inUse: this.inUse.size };
  }
}
type Conn = { id: number; busy: boolean };
let nextId = 1;
const pool = new Pool<Conn>(() => ({ id: nextId++, busy: false }), 2);
const a = pool.acquire();
const b = pool.acquire();
const c = pool.acquire();
console.log(a!.id, b!.id, c, JSON.stringify(pool.stats));
console.log(pool.release(a!), JSON.stringify(pool.stats));
const d = pool.acquire();
console.log(d!.id, d === a, JSON.stringify(pool.stats));
console.log(pool.release(c as Conn), pool.release(b!), pool.release(b!));
console.log(JSON.stringify(pool.stats), nextId);
