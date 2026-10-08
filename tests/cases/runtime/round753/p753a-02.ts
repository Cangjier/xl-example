// xl:title 类：字段、方法、访问器、静态成员与初始化次序
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
console.log('(function () { class A { x = 1', show(() => (function () { class A { x = 1; y; } return new A().x; })()));
console.log('(function () { class A { y; } ', show(() => (function () { class A { y; } return new A().y; })()));
console.log('(function () { class A { get g', show(() => (function () { class A { get g() { return 1; } } return new A().g; })()));
console.log('(function () { class A { stati', show(() => (function () { class A { static s = 2; } return A.s; })()));
console.log('(function () { class A { stati', show(() => (function () { class A { static get s() { return 3; } } return A.s; })()));
console.log('(function () { class A { m() {', show(() => (function () { class A { m() { return 1; } } return typeof A.prototype.m; })()));
console.log('(function () { class A {} retu', show(() => (function () { class A {} return Object.keys(new A()).length; })()));
console.log('(function () { class A { x = 1', show(() => (function () { class A { x = 1; } const a = new A(); return [a.x, Object.keys(a).join(",")].join("/"); })()));
console.log('(function () { class A { #p = ', show(() => (function () { class A { #p = 1; get p() { return this.#p; } } return new A().p; })()));
console.log('(function () { class A { #m() ', show(() => (function () { class A { #m() { return 1; } m2() { return this.#m(); } } return new A().m2(); })()));
console.log('(function () { class A { stati', show(() => (function () { class A { static { this.z = 5; } } return A.z; })()));
console.log('(function () { class A { ["m" ', show(() => (function () { class A { ["m" + 1]() { return 1; } } return new A().m1(); })()));
