// xl:title 双端队列：两端进出与滑动窗口
// xl:round 371
// xl:judge stdout
// xl:end
class Deque<T> {
  private items: T[] = [];
  pushBack(v: T): void { this.items.push(v); }
  pushFront(v: T): void { this.items.unshift(v); }
  popBack(): T | undefined { return this.items.pop(); }
  popFront(): T | undefined { return this.items.shift(); }
  get size(): number { return this.items.length; }
  toArray(): T[] { return this.items.slice(); }
  peekFront(): T | undefined { return this.items[0]; }
  peekBack(): T | undefined { return this.items[this.items.length - 1]; }
}
const d = new Deque<number>();
d.pushBack(1);
d.pushBack(2);
d.pushFront(0);
console.log(d.toArray().join(","), d.peekFront(), d.peekBack(), d.size);
console.log(d.popFront(), d.popBack(), d.toArray().join(","), d.size);
function maxSliding(nums: number[], k: number): number[] {
  const out: number[] = [];
  const dq = new Deque<number>();
  for (let i = 0; i < nums.length; i++) {
    while (dq.size > 0 && nums[dq.peekBack() as number] <= nums[i]) dq.popBack();
    dq.pushBack(i);
    if ((dq.peekFront() as number) <= i - k) dq.popFront();
    if (i >= k - 1) out.push(nums[dq.peekFront() as number]);
  }
  return out;
}
console.log(maxSliding([1, 3, -1, -3, 5, 3, 6, 7], 3).join(","));
