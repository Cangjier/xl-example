// xl:title for-of 里 break 会调迭代器的 return
// xl:round 9
// xl:judge stdout
// xl:end

let closed = false;
const it = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next() { return { value: i++, done: i > 5 }; },
      return() { closed = true; return { value: undefined, done: true }; },
    };
  },
};
for (const v of it) { if (v === 2) break; }
console.log("closed", closed);
