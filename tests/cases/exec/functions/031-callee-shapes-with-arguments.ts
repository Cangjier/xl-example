// xl:title 被调用者是括号 / 箭头 / 函数表达式时，实参表照样按顶层逗号切开
// xl:round 302
// xl:judge stdout
// xl:end

const h = (a: number, b: number) => a + b;
console.log((h)(1, 2), ((a: number, b: number) => a + b)(3, 4));
console.log((function (a: number, b: number) { return a * b; })(5, 6));
console.log((((a: number, b: number) => a - b))(7, 8));
const three = ((a: number, b: number, c: number) => a + b + c)(1, 2, 3);
console.log(three);
const group = (1, 2);
console.log(group);
