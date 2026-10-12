// xl:title instanceof 跨继承链与 Function.prototype
// xl:round 623
// xl:judge stdout
// xl:end

class A {}
class B extends A {}
class C extends B {}
const c = new C();
console.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);
console.log(A instanceof Function, (() => {}) instanceof Function, [] instanceof Array);
