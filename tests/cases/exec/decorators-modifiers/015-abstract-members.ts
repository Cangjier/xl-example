// xl:title 抽象类与抽象成员
// xl:round 291
// xl:judge stdout
// xl:end

abstract class A { abstract m(): number; n = 1; }
class B extends A { m() { return this.n; } }
console.log(new B().m());
