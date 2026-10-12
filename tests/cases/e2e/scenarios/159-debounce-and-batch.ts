// xl:title 批处理调度：合并、去重、按序冲刷
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Batcher<T> {
  private pending: T[] = [];
  private seen = new Set<string>();
  constructor(private keyOf: (item: T) => string, private size: number, private flush: (items: T[]) => void) {}
  add(item: T): void {
    const key = this.keyOf(item);
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.pending.push(item);
    if (this.pending.length >= this.size) this.drain();
  }
  drain(): void {
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    this.seen.clear();
    this.flush(batch);
  }
  get queued(): number { return this.pending.length; }
}
const flushes: string[] = [];
const batcher = new Batcher<number>((n) => String(n % 3), 2, (items) => flushes.push(items.join("+")));
for (const n of [1, 2, 3, 4, 5, 6, 7]) {
  batcher.add(n);
  console.log("after", n, "queued", batcher.queued, "flushes", flushes.join("|"));
}
batcher.drain();
console.log(flushes.join(" "), batcher.queued);
const empty: string[] = [];
const b2 = new Batcher<string>((s) => s, 5, (items) => empty.push(items.join("")));
b2.drain();
console.log(empty.length, b2.queued);
