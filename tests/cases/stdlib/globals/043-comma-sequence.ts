// xl:title 逗号表达式与赋值链的返回值
// xl:round 623
// xl:judge stdout
// xl:end

let a = 0;
let b = (a = 1, a + 1);
console.log(a, b);
let x: number, y: number;
x = y = 5;
console.log(x, y);
