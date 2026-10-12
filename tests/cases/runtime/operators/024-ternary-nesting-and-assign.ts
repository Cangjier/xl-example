// xl:title 三元嵌套与三元里的赋值
// xl:judge stdout
// xl:end

function grade(n: number) { return n >= 90 ? "A" : n >= 80 ? "B" : n >= 70 ? "C" : "F"; }
console.log(grade(95), grade(85), grade(75), grade(10));
let flag = false;
const r = flag ? (flag = false) : (flag = true);
console.log(r, flag);
