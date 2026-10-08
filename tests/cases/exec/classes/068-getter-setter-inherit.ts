// xl:title 访问器沿原型链继承，`super` 取值
// xl:round 691
// xl:judge stdout
// xl:end
class A { get v(): number { return 1; } set v(x: number) { console.log("set", x); } }
class B extends A { get w(): number { return super.v + 10; } }
const b: any = new B();
console.log(b.v, b.w);
b.v = 5;
console.log(Object.getOwnPropertyDescriptor(A.prototype, "v")!.get!.name);
