// xl:title `delete` 一个继承来的属性：返回真，但原型上那一格还在
// xl:round 305
// xl:judge stdout
// xl:end

class A { m() { return 1; } }
const a = new A();
console.log(delete (a as any).m, "m" in a, a.m());
