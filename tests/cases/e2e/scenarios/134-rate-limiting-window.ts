// xl:title 滑动窗口限流与统计
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class SlidingWindow {
  private hits: number[] = [];
  constructor(private limit: number, private windowMs: number) {}
  allow(now: number): boolean {
    this.hits = this.hits.filter((t) => now - t < this.windowMs);
    if (this.hits.length >= this.limit) return false;
    this.hits.push(now);
    return true;
  }
  get current(): number { return this.hits.length; }
}
const w = new SlidingWindow(3, 100);
const events = [0, 10, 20, 30, 40, 110, 120, 130];
const decisions: string[] = [];
for (const t of events) decisions.push((w.allow(t) ? "y" : "n") + "@" + t);
console.log(decisions.join(" "));
console.log(w.current);
const w2 = new SlidingWindow(2, 50);
let allowed = 0;
for (let t = 0; t < 200; t += 10) if (w2.allow(t)) allowed += 1;
console.log(allowed, w2.current);
const w3 = new SlidingWindow(1, 1000);
console.log(w3.allow(0), w3.allow(1), w3.allow(1001));
