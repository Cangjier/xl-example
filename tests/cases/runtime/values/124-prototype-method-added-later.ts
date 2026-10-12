// xl:title 实例造好之后往原型上挂方法，实例照样调得到
// xl:round 305
// xl:judge stdout
// xl:end

class A { n = 1; }
const a = new A();
(A.prototype as any).double = function (this: any) { return this.n * 2; };
console.log(a.double());
