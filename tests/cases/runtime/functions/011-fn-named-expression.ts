// xl:title 具名函数表达式：名字只在函数体内可见
// xl:judge stdout
// xl:end

const fact = function f(n: number): number { return n <= 1 ? 1 : n * f(n - 1); };
console.log(fact(5), typeof (function g() { return 1; }));
