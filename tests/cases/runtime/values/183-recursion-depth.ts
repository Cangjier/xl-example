// xl:title 递归深度：线性递归、树递归、相互递归
// xl:round 371
// xl:judge stdout
// xl:end
function sum(n: number): number { return n === 0 ? 0 : n + sum(n - 1); }
console.log(sum(2000));
function fib(n: number): number { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
console.log(fib(20));
function isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }
function isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }
console.log(isEven(1000), isOdd(7));
type Tree = { v: number; kids: Tree[] };
const tree: Tree = { v: 1, kids: [{ v: 2, kids: [] }, { v: 3, kids: [{ v: 4, kids: [] }] }] };
function totalOf(t: Tree): number { return t.v + t.kids.reduce((a, k) => a + totalOf(k), 0); }
console.log(totalOf(tree));
