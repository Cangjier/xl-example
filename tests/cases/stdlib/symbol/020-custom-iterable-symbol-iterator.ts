// xl:title 对象自定义 `Symbol.iterator` 之后能进 `for..of` 与展开
// xl:round 305
// xl:judge stdout
// xl:end

const range: any = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let i = this.from;
    const to = this.to;
    return { next: () => (i <= to ? { value: i++, done: false } : { value: undefined, done: true }) };
  },
};
console.log([...range].join(","));
for (const v of range) console.log("v", v);
