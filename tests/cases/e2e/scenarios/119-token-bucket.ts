// xl:title 令牌桶限流器（注入时钟 + 批量判定）
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(private rate: number, private capacity: number, now: number) { this.tokens = capacity; this.last = now; }
  tryConsume(n: number, now: number): boolean {
    this.refill(now);
    if (this.tokens >= n) { this.tokens -= n; return true; }
    return false;
  }
  private refill(now: number): void {
    const elapsed = now - this.last;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
      this.last = now;
    }
  }
  available(now: number): number { this.refill(now); return Math.floor(this.tokens); }
}
const bucket = new TokenBucket(0.1, 5, 0);
const results: string[] = [];
for (let t = 0; t < 6; t++) results.push(bucket.tryConsume(2, t) ? "y" : "n");
console.log(results.join(""));
console.log(bucket.available(6), bucket.available(100), bucket.available(1000));
const burst = new TokenBucket(1, 3, 0);
console.log([0, 0, 0, 0].map((_, i) => (burst.tryConsume(1, i) ? "y" : "n")).join(""));
console.log(burst.tryConsume(1, 10));
