// xl:title 嵌套三元与条件里的赋值：结合性与求值顺序
// xl:round 7
// xl:judge stdout
// xl:end

const f = (n: number): string => (n < 0 ? "neg" : n === 0 ? "zero" : n < 10 ? "small" : "big");
console.log([-1, 0, 5, 50].map(f).join(","));
let a = 0;
const b = (a = 1) ? "t" : "f";
console.log(a, b, (a = 0) || (a = 2), a);
