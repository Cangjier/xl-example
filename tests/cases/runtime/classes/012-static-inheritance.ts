// xl:title 静态成员随继承走：`this` 是那一个类
// xl:judge stdout
// xl:end

class A {
  static tag = "A";
  static make(): string { return "made:" + this.tag; }
}
class B extends A {
  static tag = "B";
}
console.log(A.make(), B.make(), B.tag, A.tag);
