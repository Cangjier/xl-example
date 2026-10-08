// xl:title 自定义可迭代对象：Symbol.iterator 返回带 next 的对象
// xl:judge stdout
// xl:end

const range = {
  from: 1,
  to: 3,
  [Symbol.iterator]() {
    let n = this.from;
    const last = this.to;
    return { next: () => (n <= last ? { value: n++, done: false } : { value: undefined, done: true }) };
  },
};
console.log([...range].join(","));
const out: number[] = [];
for (const v of range) out.push(v * 10);
console.log(out.join(","));
