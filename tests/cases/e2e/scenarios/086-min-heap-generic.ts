// xl:title 泛型最小堆：比较器、push/pop、堆排序
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Heap<T> {
  private items: T[] = [];
  constructor(private cmp: (a: T, b: T) => number) {}
  get size(): number { return this.items.length; }
  peek(): T | undefined { return this.items[0]; }
  push(v: T): void {
    this.items.push(v);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.cmp(this.items[i], this.items[parent]) >= 0) break;
      const tmp = this.items[i];
      this.items[i] = this.items[parent];
      this.items[parent] = tmp;
      i = parent;
    }
  }
  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop() as T;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let best = i;
        if (l < this.items.length && this.cmp(this.items[l], this.items[best]) < 0) best = l;
        if (r < this.items.length && this.cmp(this.items[r], this.items[best]) < 0) best = r;
        if (best === i) break;
        const tmp = this.items[i];
        this.items[i] = this.items[best];
        this.items[best] = tmp;
        i = best;
      }
    }
    return top;
  }
}
const h = new Heap<number>((a, b) => a - b);
for (const v of [5, 1, 9, 3, 7, 1]) h.push(v);
const sorted: number[] = [];
while (h.size > 0) sorted.push(h.pop() as number);
console.log(sorted.join(","));
type Task = { name: string; priority: number };
const th = new Heap<Task>((a, b) => b.priority - a.priority);
th.push({ name: "low", priority: 1 });
th.push({ name: "high", priority: 9 });
th.push({ name: "mid", priority: 5 });
console.log(th.pop()!.name, th.pop()!.name, th.peek()!.name, th.size);
