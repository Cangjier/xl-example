// xl:title 函数的 length / name 与声明式 / 箭头式 / 方法
// xl:judge stdout
// xl:end

function three(a: number, b: number, c: number) { return a + b + c; }
const two = (a: number, b: number) => a + b;
const o = { method(a: number, b: number, c: number, d: number) { return d; } };
console.log(three.length, two.length, o.method.length, three.name, two.name);
