// xl:title 三元表达式里带赋值与逗号
// xl:round 304
// xl:judge stdout
// xl:end

let a = 1;
let b = 2;
const pick = a < b ? (a = 10, "less") : (b = 20, "more");
console.log(pick, a, b);
console.log(a > b ? "gt" : a === b ? "eq" : "lt");
