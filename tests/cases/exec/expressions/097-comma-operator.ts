// xl:title 逗号运算符：只取最后一个值、for 的更新位、声明里的逗号不是运算符
// xl:round 7
// xl:judge stdout
// xl:end

let a = (1, 2, 3);
let i = 0, j = 10;
for (let x = 0, y = 5; x < 3; x++, y--) j = y;
console.log(a, j);
const f = () => (console.log("side"), "ret");
console.log(f());
