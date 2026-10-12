// xl:title `as` 落在展开位里：`[...(o as any)]`
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
console.log([...(iterable as any)].join(","));
