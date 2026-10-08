// xl:title instanceof 沿原型链判断（三层）
// xl:judge stdout
// xl:end

class A {}
class B extends A {}
class C extends B {}
const c = new C();
console.log(c instanceof C, c instanceof B, c instanceof A, c instanceof Object);
console.log(new A() instanceof B, new A() instanceof C);
