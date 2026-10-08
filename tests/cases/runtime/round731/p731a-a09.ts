// xl:title 闭包的 `length` / `name` 与原型上那一格**互不干扰**（第 690 轮那 40 条回归的哨兵）
// xl:round 731
// xl:judge stdout
// xl:end
function named(a: number, b: number) { return a + b; }
const arrow = (x: number) => x;
const meth = { m(a: number, b: number, c: number) { return a; } }.m;
console.log(named.length, named.name, arrow.length, arrow.name, meth.length, meth.name);
console.log(Function.prototype.length, JSON.stringify(Function.prototype.name));
