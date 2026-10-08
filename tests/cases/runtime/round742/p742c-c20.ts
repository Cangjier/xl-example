// xl:title `while` 条件里的副作用每轮算一次
// xl:round 742
// xl:judge stdout
// xl:end
let i = 0;
const out: number[] = [];
while (i++ < 3) out.push(i);
console.log(out.join(","), i);
