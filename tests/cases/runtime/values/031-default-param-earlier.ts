// xl:title 默认值可以引用前面的形参，也可以调函数
// xl:judge stdout
// xl:end

function f(a: number, b: number = a * 2, c: string = "c" + b): string { return a + "/" + b + "/" + c; }
console.log(f(1), f(1, 5), f(1, undefined, "z"));
function g(x: number, y: number = h(x)): number { return y; }
function h(n: number): number { return n + 100; }
console.log(g(1), g(1, 2));
