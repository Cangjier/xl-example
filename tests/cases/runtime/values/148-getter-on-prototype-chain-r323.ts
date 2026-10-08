// xl:title 原型链上的访问器：实例读、子类覆盖
// xl:round 323
// xl:judge stdout
// xl:end

class A { get label() { return "A"; } }
class B extends A { get label() { return super.label + "B"; } }
const b = new B();
console.log(b.label, Object.getPrototypeOf(B.prototype) === A.prototype);
