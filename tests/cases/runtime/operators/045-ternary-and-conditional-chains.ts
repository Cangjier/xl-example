// xl:title 三元与条件的嵌套、赋值、短路
// xl:round 371
// xl:judge stdout
// xl:end
const score = 75;
const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "F";
console.log(grade);
let n = 0;
const r = true ? (n = 1, "t") : (n = 2, "f");
console.log(r, n);
const nested = (1 ? (0 ? "a" : "b") : "c") + (null ? "x" : "y");
console.log(nested);
let flag = false;
const side = flag ? (flag = true, "set") : "unset";
console.log(side, flag);
console.log([1, 2, 3].map((v) => (v % 2 ? "odd" : "even")).join(","));
