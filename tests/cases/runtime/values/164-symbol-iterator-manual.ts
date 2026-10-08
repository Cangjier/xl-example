// xl:title 自定义迭代器：显式取出 `Symbol.iterator` 再推进
// xl:round 330
// xl:judge stdout
// xl:end

const iterable = {
  [Symbol.iterator](): { next(): { value: number; done: boolean } } {
    let at = 0;
    return {
      next(): { value: number; done: boolean } {
        at = at + 1;
        if (at > 3) return { value: 0, done: true };
        return { value: at * 10, done: false };
      },
    };
  },
};
const it = (iterable as any)[Symbol.iterator]();
console.log(it.next().value, it.next().value, it.next().value, it.next().done);
const spread: number[] = [...(iterable as any)];
console.log(spread.join(","));
