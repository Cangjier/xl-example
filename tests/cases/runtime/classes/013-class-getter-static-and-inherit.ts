// xl:title 静态访问器与继承下来的静态访问器
// xl:judge stdout
// xl:end

class A {
  static get kind(): string { return "A-static"; }
  get own(): string { return "own"; }
}
class B extends A {
  static get kind(): string { return "B+" + super.kind; }
}
console.log(B.kind, new B().own, new A().own);
