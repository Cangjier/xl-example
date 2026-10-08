// xl:title 类里的访问器 + 继承的访问器
// xl:judge stdout
// xl:end

class A { get v(): number { return 1; } set v(x: number) { console.log("A set", x); } }
class B extends A { get v(): number { return super.v + 1; } }
const b = new B();
console.log(b.v);
b.v = 5;
