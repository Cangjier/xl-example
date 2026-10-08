// xl:title `setPrototypeOf` 之后 `instanceof` 跟着变
// xl:round 305
// xl:judge stdout
// xl:end

class A {}
class B {}
const b = new B();
console.log(b instanceof A, b instanceof B);
Object.setPrototypeOf(b, A.prototype);
console.log(b instanceof A, b instanceof B);
