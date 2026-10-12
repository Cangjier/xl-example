// xl:title 三层继承：方法解析、super、字段遮蔽
// xl:round 371
// xl:judge stdout
// xl:end
class A { v = "a"; who(): string { return "A:" + this.v; } }
class B extends A { v = "b"; who(): string { return "B(" + super.who() + ")"; } }
class C extends B { v = "c"; who(): string { return "C(" + super.who() + ")"; } }
const c = new C();
console.log(c.who(), c.v, new A().who(), new B().who());
console.log(Object.keys(c).join(","), c instanceof A, c instanceof B, Object.getPrototypeOf(C.prototype) === B.prototype);
console.log(A.prototype.who.call(c), B.prototype.who.call(c));
