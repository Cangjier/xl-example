// xl:title 访问器继承与 super 访问器
// xl:round 9
// xl:judge stdout
// xl:end

class A { get v() { return 1; } set v(x: number) { console.log("A set", x); } }
class B extends A { get v() { return super.v + 10; } set v(x: number) { super.v = x * 2; } }
const b = new B();
console.log(b.v);
b.v = 3;
