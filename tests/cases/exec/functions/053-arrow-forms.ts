// xl:title 箭头函数的各种写法与返回值形态
// xl:round 371
// xl:judge stdout
// xl:end
const a = () => 1;
const b = (x: number) => ({ v: x });
const c = (x: number): number => { return x * 2; };
const d = async (x: number) => x + 1;
const e = (x: number) => (y: number) => x + y;
const f = <T,>(xs: T[]): number => xs.length;
console.log(a(), b(1).v, c(3), e(1)(2), f([1, 2]), a.length, b.length);
d(1).then((v) => console.log("async", v));
const nested = () => () => () => "deep";
console.log(nested()()());
