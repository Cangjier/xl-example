// xl:title 箭头函数的默认值与解构参数
// xl:round 371
// xl:judge stdout
// xl:end
const f = ({ a, b = 2 }: { a: number; b?: number } = { a: 1 }): number => a + b;
const g = ([x, y = 10]: number[] = []): number => x + y;
const h = (n: number, cb: (v: number) => number = (v) => v): number => cb(n);
console.log(f(), f({ a: 5 }), g(), g([1]), g([1, 2]), h(3), h(3, (v) => v * 2));
console.log(f.length, g.length, h.length);
