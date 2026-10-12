// xl:title 互递归的闭包对与尾调用深度
// xl:round 623
// xl:judge stdout
// xl:end

function isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }
function isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }
console.log(isEven(10), isOdd(10), isEven(101));
