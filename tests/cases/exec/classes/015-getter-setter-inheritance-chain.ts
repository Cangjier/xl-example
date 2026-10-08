// xl:title 三层继承里的访问器与 `super` 链
// xl:judge stdout
// xl:end

class A { get v(): number { return 1; } }
class B extends A { get v(): number { return super.v + 10; } }
class C extends B { get v(): number { return super.v + 100; } }
console.log(new A().v, new B().v, new C().v);
