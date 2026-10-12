// xl:title 赋值链的返回值、复合赋值的返回值
// xl:judge stdout
// xl:end

let a = 1, b = 2, c = 3;
a = b = c = 9;
console.log(a, b, c);
let s = "x";
console.log(s += "y", s);
let n = 10;
console.log(n -= 4, n *= 2, n /= 3, n %= 4, n);
