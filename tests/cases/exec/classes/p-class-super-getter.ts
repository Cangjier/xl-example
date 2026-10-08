// xl:title 子类取值器转交 super
// xl:round 692
// xl:judge stdout
// xl:end

class A {
  get x() {
    return 1;
  }
}
class B extends A {
  get x() {
    return super.x + 1;
  }
}
console.log(new B().x);
