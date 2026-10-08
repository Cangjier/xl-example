// xl:title 静态成员可继承
// xl:round 692
// xl:judge stdout
// xl:end

class A {
  static foo() {
    return 42;
  }
}
class B extends A {}
console.log(B.foo());
