// xl:title super.x 读的是父类原型上的那一格
// xl:round 304
// xl:judge stdout
// xl:end

class A { get label() { return "A"; } m() { return "A.m"; } }
class B extends A {
  get label() { return "B+" + super.label; }
  m() { return "B+" + super.m(); }
}
const b = new B();
console.log(b.label, b.m());
