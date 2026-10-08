// xl:title 函数名与形参个数的四个来源
// xl:round 291
// xl:judge stdout
// xl:end

function decl(a: number, b: number) { return a + b; }
const expr = function named(x: number) { return x; };
const arrow = (a: number, b = 1) => a + b;
const meth = { m(p: number) { return p; } };
console.log(decl.name, expr.name, arrow.name, meth.m.name);
console.log(decl.length, expr.length, arrow.length, meth.m.length);
