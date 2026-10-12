// xl:title 泛型函数带显式类型实参调用
// xl:round 304
// xl:judge stdout
// xl:end

function first<T>(xs: T[]): T | undefined { return xs[0]; }
console.log(first<number>([1, 2]), first<string>(["a"]));
const pick = <T,>(v: T): T => v;
console.log(pick<number>(7), pick("s"));
