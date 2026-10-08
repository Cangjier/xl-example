// xl:title 类的访问器沿继承链走：三层各写一半
// xl:judge stdout
// xl:end

class A { get v() { return 1; } }
class B extends A { get v() { return super.v + 10; } }
class C extends B { get v() { return super.v + 100; } }
console.log(new A().v, new B().v, new C().v);
