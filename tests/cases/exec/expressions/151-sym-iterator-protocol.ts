// xl:title 自定义 Symbol.iterator 让对象可被 for-of
// xl:round 678
// xl:judge stdout
// xl:end

const o: any = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() {
        i += 1;
        return i <= 3 ? { value: i, done: false } : { value: undefined, done: true };
      },
    };
  },
};
const seen: number[] = [];
for (const v of o) seen.push(v);
console.log(seen.join(","));
console.log([...o].join(","));
