// xl:title 具名函数表达式的名字在函数体内可见（可递归）
// xl:round 323
// xl:judge stdout
// xl:end

const fact = function self(n: number): number { return n <= 1 ? 1 : n * self(n - 1); };
console.log(fact(5), typeof (fact as any).self);
