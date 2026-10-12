// xl:title 函数式小工具：`compose` / `pipe` / 柯里化 / 闭包计数器
// xl:round 305
// xl:judge stdout
// xl:end

type Fn = (n: number) => number;
const compose = (...fns: Fn[]): Fn => (n) => fns.reduceRight((acc, f) => f(acc), n);
const pipe = (...fns: Fn[]): Fn => (n) => fns.reduce((acc, f) => f(acc), n);
const add = (a: number) => (b: number) => a + b;
const inc: Fn = (n) => n + 1;
const dbl: Fn = (n) => n * 2;
console.log(compose(inc, dbl)(5), pipe(inc, dbl)(5), add(3)(4));
function counter(): () => number {
  let n = 0;
  return () => ++n;
}
const c1 = counter();
const c2 = counter();
console.log(c1(), c1(), c2(), c1());
