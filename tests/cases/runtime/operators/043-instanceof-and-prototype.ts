// xl:title instanceof 与原型替换、跨类判定
// xl:round 371
// xl:judge stdout
// xl:end
class A {}
class B extends A {}
class C extends B {}
const c = new C();
console.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);
console.log(Object.getPrototypeOf(C) === B, Object.getPrototypeOf(c) === C.prototype);
const o = Object.create(C.prototype);
console.log(o instanceof C, o instanceof A);
C.prototype = {} as any;
console.log(c instanceof C, o instanceof C, new C() instanceof A);
