// xl:title 泛型箭头直接当实参
// xl:judge stdout
// xl:end

const apply = <T, U>(v: T, f: (x: T) => U): U => f(v);
console.log(apply(2, <T,>(x: T): T => x));
