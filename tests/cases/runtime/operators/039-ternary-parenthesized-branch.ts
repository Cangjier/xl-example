// xl:title 三元的两支带括号：值位不是类型位
// xl:round 330
// xl:judge stdout
// xl:end

const flag = true;
const n = flag ? (1 + 2) : 3;
const s = flag ? (() => "a")() : "b";
console.log(n, s);
