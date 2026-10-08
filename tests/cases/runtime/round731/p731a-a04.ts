// xl:title `length` 是自有且不可写：赋值静默失败
// xl:round 731
// xl:judge stdout
// xl:end
function f(a: number) {}
f.length = 5;
f.name = "renamed";
console.log(f.length, f.name);
const g = (a: number, b: number) => a;
g.length = 9;
console.log(g.length);
