// xl:title instanceof 沿整条继承链；Object 那一格恒真
// xl:round 323
// xl:judge stdout
// xl:end

class A {} class B extends A {} class C extends B {}
const c = new C();
console.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);
console.log(new A() instanceof B, Object.create(null) instanceof Object);
