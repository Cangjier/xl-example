// xl:title Symbol.iterator：自定义可迭代物进展开 / for..of
// xl:judge stdout
// xl:end

const o: any = {
  [Symbol.iterator]() {
    let i = 0;
    return { next: () => (i < 3 ? { value: i++, done: false } : { value: 0, done: true }) };
  },
};
console.log([...o].join(","), [..."ab"].join(","));
