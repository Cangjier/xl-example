// xl:title 自定义可迭代对象要能反复迭代（每次给新迭代器）
// xl:judge stdout
// xl:end

class Range {
  lo: number;
  hi: number;
  constructor(lo: number, hi: number) { this.lo = lo; this.hi = hi; }
  [Symbol.iterator](): any {
    let i = this.lo;
    const hi = this.hi;
    return { next: () => (i <= hi ? { value: i++, done: false } : { value: 0, done: true }) };
  }
}
const r = new Range(1, 4);
console.log([...r].join(","), [...r].join(","));
let sum = 0;
for (const v of r) sum += v;
console.log(sum);
