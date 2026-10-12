// xl:title abstract 成员与类型位一起消失，子类可覆盖
// xl:round 623
// xl:judge stdout
// xl:end

abstract class A {
  abstract m(): string;
  n() { return "n" + this.m(); }
}
class B extends A { m() { return "m"; } }
console.log(new B().n(), typeof (A as any).prototype.m);
