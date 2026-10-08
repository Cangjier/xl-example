// xl:title 类：继承、`super` 的三种用法与 `new.target`
// xl:round 753
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { class A { m() {', show(() => (function () { class A { m() { return 1; } } class B extends A {} return new B().m(); })()));
console.log('(function () { class A { m() {', show(() => (function () { class A { m() { return 1; } } class B extends A { m() { return super.m() + 1; } } return new B().m(); })()));
console.log('(function () { class A { const', show(() => (function () { class A { constructor(x: any) { this.a = x; } } class B extends A { constructor() { super(1); } } return new B().a; })()));
console.log('(function () { class A {} clas', show(() => (function () { class A {} class B extends A { constructor() { super(); this.b = 2; } } return new B().b; })()));
console.log('(function () { class A { stati', show(() => (function () { class A { static m() { return 1; } } class B extends A { static m() { return super.m() + 1; } } return B.m(); })()));
console.log('(function () { class A {} retu', show(() => (function () { class A {} return new A() instanceof A; })()));
console.log('(function () { class A {} clas', show(() => (function () { class A {} class B extends A {} return Object.getPrototypeOf(B.prototype) === A.prototype; })()));
console.log('(function () { class A {} clas', show(() => (function () { class A {} class B extends A {} return Object.getPrototypeOf(B) === A; })()));
