// xl:title `super` 的四条路：方法 / 访问器 / 构造 / 静态
// xl:round 747
// xl:judge stdout
// xl:end
class A {
  v() { return "A.v"; }
  static sv() { return "A.sv"; }
  get g() { return "A.g"; }
}
class B extends A {
  v() { return super.v() + "/B.v"; }
  static sv() { return super.sv() + "/B.sv"; }
  get g() { return super.g + "/B.g"; }
}
console.log(new B().v(), B.sv(), new B().g);
class C extends A {}
console.log(new C().v(), C.sv(), new C().g);
class D extends A { constructor() { super(); console.log("ctor", this.v()); } }
new D();
