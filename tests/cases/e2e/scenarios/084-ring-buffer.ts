// xl:title 环形缓冲区：覆盖写、读取与容量
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Ring<T> {
  private items: (T | undefined)[] = [];
  private head = 0;
  private count = 0;
  constructor(private cap: number) { for (let i = 0; i < cap; i++) this.items.push(undefined); }
  push(v: T): T | undefined {
    const overwritten = this.count === this.cap ? this.items[this.head] : undefined;
    this.items[this.head] = v;
    this.head = (this.head + 1) % this.cap;
    if (this.count < this.cap) this.count += 1;
    return overwritten;
  }
  toArray(): T[] {
    const out: T[] = [];
    const start = (this.head - this.count + this.cap) % this.cap;
    for (let i = 0; i < this.count; i++) out.push(this.items[(start + i) % this.cap] as T);
    return out;
  }
  get size(): number { return this.count; }
  get full(): boolean { return this.count === this.cap; }
}
const r = new Ring<number>(3);
console.log(r.push(1), r.push(2), r.push(3), r.toArray().join(","), r.full);
console.log(r.push(4), r.toArray().join(","), r.size);
console.log(r.push(5), r.push(6), r.toArray().join(","));
const big = new Ring<string>(2);
big.push("a");
console.log(big.toArray().join(","), big.full, big.size);
