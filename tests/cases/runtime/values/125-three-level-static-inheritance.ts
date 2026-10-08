// xl:title 三级静态继承：`this.kind` 在静态 getter 里认的是**子类**
// xl:round 305
// xl:judge stdout
// xl:end

class A {
  static kind = "a";
  static get label(): string { return "A-" + this.kind; }
}
class B extends A { static kind = "b"; }
class C extends B {}
console.log(A.label, B.label, C.label, C.kind);
