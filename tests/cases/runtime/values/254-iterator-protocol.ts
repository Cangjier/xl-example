// xl:title 自定义同步迭代器 + 展开 + for-of + 解构
// xl:round 9
// xl:judge stdout
// xl:end

class Range {
  lo: number;
  hi: number;
  constructor(lo: number, hi: number) { this.lo = lo; this.hi = hi; }
  [Symbol.iterator]() {
    let i = this.lo;
    const hi = this.hi;
    return {
      next() { return i <= hi ? { value: i++, done: false } : { value: 0, done: true }; },
    };
  }
}
const r = new Range(1, 4);
console.log([...r].join("-"));
for (const v of r) console.log("of", v);
const [a, b] = r;
console.log(a, b);
