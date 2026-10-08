// xl:title 函数类型的别名当标注用
// xl:round 305
// xl:judge stdout
// xl:end

type Fn = (n: number) => number;
const double: Fn = (n) => n * 2;
const use = (f: Fn, v: number) => f(v);
console.log(double(21), use(double, 4));
