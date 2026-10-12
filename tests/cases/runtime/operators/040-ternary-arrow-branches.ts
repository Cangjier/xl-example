// xl:title 三元的两支是箭头函数：不套括号的写法
// xl:round 330
// xl:judge stdout
// xl:end

const flag = true;
const add = flag ? (a: number) => a + 1 : (a: number) => a - 1;
console.log(add(5));
const pick = flag ? () => "yes" : () => "no";
console.log(pick());
