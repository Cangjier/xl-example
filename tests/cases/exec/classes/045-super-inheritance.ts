// xl:title 继承链上的 super：构造器 / 方法 / 静态 / 访问器
// xl:round 623
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class A {
  constructor(public v: number) {}
  m() { return "A" + this.v; }
  static s() { return "SA"; }
  get g() { return 1; }
}
class B extends A {
  constructor() { super(2); }
  m() { return "B" + super.m(); }
  static s() { return "SB" + super.s(); }
  get g() { return super.g + 1; }
}
const b = new B();
console.log(b.m(), B.s(), b.g, b.v);
