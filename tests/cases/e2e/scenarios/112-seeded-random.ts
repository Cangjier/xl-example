// xl:title 可复现的伪随机数（LCG）与洗牌 / 抽样
// xl:round 371
// xl:judge stdout
// xl:end
class Rng {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0; }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
  int(maxExclusive: number): number { return Math.floor(this.next() * maxExclusive); }
  pick<T>(xs: T[]): T { return xs[this.int(xs.length)]; }
  shuffle<T>(xs: T[]): T[] {
    const out = xs.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }
}
const a = new Rng(42);
const b = new Rng(42);
console.log(a.next().toFixed(6), b.next().toFixed(6), a.next() === b.next());
const rng = new Rng(7);
console.log([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => rng.int(100)).join(","));
const rng2 = new Rng(1);
console.log(rng2.shuffle([1, 2, 3, 4, 5]).join(""));
console.log(new Rng(99).shuffle([1, 2, 3, 4, 5]).join("") === new Rng(99).shuffle([1, 2, 3, 4, 5]).join(""));
const r = new Rng(3);
let inRange = true;
for (let i = 0; i < 1000; i++) { const v = r.next(); if (v < 0 || v >= 1) inRange = false; }
console.log("inRange", inRange);
