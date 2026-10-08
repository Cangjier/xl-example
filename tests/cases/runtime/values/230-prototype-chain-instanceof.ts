// xl:title 原型链：三层继承上的 instanceof 与 isPrototypeOf，改原型后判定跟着变
// xl:round 7
// xl:judge stdout
// xl:end

class A {} class B extends A {} class C extends B {}
const c = new C();
console.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);
console.log(A.prototype.isPrototypeOf(c), C.prototype.isPrototypeOf(new B()));
console.log(Object.getPrototypeOf(C.prototype) === B.prototype);
