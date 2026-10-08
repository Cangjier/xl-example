// xl:title 手写迭代器协议与 `for...of` 的关系
// xl:round 691
// xl:judge stdout
// xl:end
const it: any = {
  i: 0,
  next() { this.i++; return this.i <= 2 ? { value: this.i, done: false } : { value: undefined, done: true }; },
  [Symbol.iterator]() { return this; },
};
console.log([...it].join(","));
for (const v of ({ [Symbol.iterator]: function* () { yield 1; yield 2; } } as any)) console.log(v);
