// xl:title 函数的 name / length 在各种定义形态下
// xl:round 371
// xl:judge stdout
// xl:end
function decl(a: number, b: number, c = 1) {}
const arrow = (a: number, b = 2) => a + b;
const assigned = function (a: number) { return a; };
const method = { m(a: number, b: number) { return a + b; } };
const cls = class Named { m(a: number) {} };
console.log(decl.name, decl.length, arrow.name, arrow.length, assigned.name, assigned.length);
console.log(method.m.name, method.m.length, cls.name, cls.prototype.m.name.length >= 0);
const bound = decl.bind(null);
console.log(bound.name, bound.length);
const computed = { ["k" + 1]() {} };
console.log(Object.keys(computed).join(","), (computed as any).k1.name);
