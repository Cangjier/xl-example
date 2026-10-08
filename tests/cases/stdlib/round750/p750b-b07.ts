// xl:title `Function.prototype` 的 `length` / `name` 在六种写法上
// xl:round 750
// xl:judge stdout
// xl:end
function f1(a: any, b: any) {}
const f2 = (a: any) => a;
const f3 = function (a: any, b: any, c: any) {};
const f4 = function named(a: any) {};
class C { m(a: any, b = 1, ...rest: any[]) {} }
const o = { m(a: any, ...r: any[]) {}, n: () => {} };
console.log(f1.length, f2.length, f3.length, f4.length, f4.name);
console.log(C.prototype.m.length, o.m.length, o.n.length, o.n.name);
console.log(f1.name, f2.name, f3.name, C.name, (() => {}).name);
console.log(f1.bind(null, 1).length, f1.bind(null, 1).name);
