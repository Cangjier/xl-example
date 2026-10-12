// xl:title 逗号表达式出现在 return 与实参位
// xl:round 304
// xl:judge stdout
// xl:end

function f() { return (1, 2, 3); }
console.log(f());
function g(a: number, b: number) { return a + b; }
let t = 0;
console.log(g((t = 1, 10), (t = 2, 20)), t);
