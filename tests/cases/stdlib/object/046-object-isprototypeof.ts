// xl:title Object.prototype.isPrototypeOf
// xl:round 304
// xl:judge stdout
// xl:end

class A {}
class B extends A {}
const b = new B();
console.log(A.prototype.isPrototypeOf(b), Object.prototype.isPrototypeOf(b), B.prototype.isPrototypeOf({}));
console.log(A.isPrototypeOf(b));
