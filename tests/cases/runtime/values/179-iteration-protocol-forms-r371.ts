// xl:title 迭代协议：手动 next、提前退出、return() 收尾
// xl:round 371
// xl:judge stdout
// xl:end
const iterable = {
  data: [1, 2, 3],
  [Symbol.iterator]() {
    let i = 0;
    const self = this;
    return {
      next: () => (i < self.data.length ? { value: self.data[i++], done: false } : { value: undefined, done: true }),
      return: () => { console.log("closed"); return { value: undefined, done: true }; },
    };
  },
};
console.log([...iterable].join(","));
for (const v of iterable) { if (v === 2) break; console.log("got", v); }
const it = iterable[Symbol.iterator]();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()));
console.log([...iterable].length, Array.from(iterable).length);
