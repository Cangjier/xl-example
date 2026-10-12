// xl:title 自定义可迭代对象：`[Symbol.iterator]` + `next()` 对象
// xl:round 323
// xl:judge stdout
// xl:end

class Range {
  n: number;
  constructor(n: number) { this.n = n; }
  [Symbol.iterator]() {
    let i = 0;
    const n = this.n;
    return { next: () => (i < n ? { value: i++, done: false } : { value: undefined, done: true }) };
  }
}
console.log([...new Range(4)].join(","));
console.log(Array.from(new Range(3)).join("-"));
