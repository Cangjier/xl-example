// xl:title 自定义可迭代集合：Symbol.iterator + for..of + 展开
// xl:round 330
// xl:judge stdout
// xl:end

class Range {
  from: number;
  to: number;
  constructor(from: number, to: number) {
    this.from = from;
    this.to = to;
  }
  [Symbol.iterator](): { next(): { value: number; done: boolean } } {
    let at = this.from;
    const stop = this.to;
    return {
      next(): { value: number; done: boolean } {
        if (at >= stop) return { value: 0, done: true };
        const value = at;
        at = at + 1;
        return { value, done: false };
      },
    };
  }
}
const range = new Range(1, 5);
const collected: number[] = [];
for (const n of range) collected.push(n * n);
console.log(collected.join(","));
console.log([...range].length);
console.log(Array.from(range).join("-"));
