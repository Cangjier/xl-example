// xl:title 优先队列：二叉堆 + 比较器 + 泛型
// xl:round 330
// xl:judge stdout
// xl:end

class PriorityQueue<T> {
  private heap: T[] = [];
  private better: (a: T, b: T) => boolean;
  constructor(better: (a: T, b: T) => boolean) {
    this.better = better;
  }
  get size(): number {
    return this.heap.length;
  }
  push(value: T): void {
    this.heap.push(value);
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.better(this.heap[i], this.heap[parent])) break;
      const tmp = this.heap[i];
      this.heap[i] = this.heap[parent];
      this.heap[parent] = tmp;
      i = parent;
    }
  }
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop() as T;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let best = i;
        if (left < this.heap.length && this.better(this.heap[left], this.heap[best])) best = left;
        if (right < this.heap.length && this.better(this.heap[right], this.heap[best])) best = right;
        if (best === i) break;
        const tmp = this.heap[i];
        this.heap[i] = this.heap[best];
        this.heap[best] = tmp;
        i = best;
      }
    }
    return top;
  }
}

const pq = new PriorityQueue<number>((a, b) => a < b);
for (const n of [5, 1, 9, 3, 7, 2]) pq.push(n);
const out: number[] = [];
while (pq.size > 0) out.push(pq.pop() as number);
console.log(out.join(","));
