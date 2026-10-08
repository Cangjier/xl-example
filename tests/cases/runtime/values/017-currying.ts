// xl:title 柯里化：连着三次调用各带一格
// xl:judge stdout
// xl:end

const add = (a: number) => (b: number) => (c: number) => a + b + c;
console.log(add(1)(2)(3), add(10)(20)(30));
const apply2 = (f: (n: number) => number, v: number) => f(v);
console.log(apply2(add(1)(2), 3));
