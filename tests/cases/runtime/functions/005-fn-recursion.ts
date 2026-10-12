// xl:title 递归：阶乘 / 斐波那契 / 相互递归
// xl:judge stdout
// xl:end

function fact(n: number): number { return n <= 1 ? 1 : n * fact(n - 1); }
console.log(fact(6));
function fib(n: number): number { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
console.log(fib(15));
function isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }
function isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }
console.log(isEven(10), isOdd(7));
