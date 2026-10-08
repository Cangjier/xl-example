// xl:title 朴素递归的深度
// xl:round 291
// xl:judge stdout
// xl:end

function fib(n: number): number { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
console.log(fib(20));
