// xl:title 泛型箭头当实参传给泛型函数
// xl:round 304
// xl:judge stdout
// xl:end

function apply<T, R>(v: T, f: (x: T) => R): R { return f(v); }
const r = apply<number, string>(3, (x) => "n" + x);
console.log(r);
console.log(apply("s", (x) => x.length));
