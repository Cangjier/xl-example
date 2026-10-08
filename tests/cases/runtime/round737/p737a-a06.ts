// xl:title 数组解构走的是**迭代协议**（不是下标）
// xl:round 737
// xl:judge stdout
// xl:end
const src: any = {
  [Symbol.iterator]() {
    let i = 0;
    return { next: () => (i < 3 ? { value: "v" + ++i, done: false } : { value: undefined, done: true }) };
  },
};
const [a, b, ...rest] = src;
console.log(a, b, rest.join(","));
const [x, , y] = [1, 2, 3];
console.log(x, y);
const [p = "d", q = "e"] = [undefined, null] as any;
console.log(p, q);
