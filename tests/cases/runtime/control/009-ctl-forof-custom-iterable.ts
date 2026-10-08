// xl:title `for..of` 走自定义可迭代物（Symbol.iterator）
// xl:judge stdout
// xl:end

const range: any = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let i = this.from;
    const to = this.to;
    return { next: () => (i <= to ? { value: i++, done: false } : { value: 0, done: true }) };
  },
};
let s = 0;
for (const v of range) s += v;
console.log(s, [...range].join(","));
