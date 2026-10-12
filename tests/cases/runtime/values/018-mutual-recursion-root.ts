// xl:title 互递归：两条函数声明互相调用
// xl:judge stdout
// xl:end

function isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }
function isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }
console.log(isEven(10), isOdd(10), isEven(7), isOdd(7));
