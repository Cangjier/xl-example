// xl:title 继承链上的访问器与 `super` 取值
// xl:judge stdout
// xl:end

class A { get v(): number { return 1; } }
class B extends A { get v(): number { return super.v + 1; } }
class C extends B {}
console.log(new A().v, new B().v, new C().v);
