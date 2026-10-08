// xl:title 回调、返回函数、当场调用
// xl:judge stdout
// xl:end

function apply(x: number, f: (n: number) => number): number { return f(x); }
console.log(apply(3, (n) => n * 2), apply(3, function (n) { return n + 1; }));
console.log((function () { return "iife"; })());
function twice(f: (n: number) => number): (n: number) => number { return (n) => f(f(n)); }
console.log(twice((n) => n + 3)(1));
