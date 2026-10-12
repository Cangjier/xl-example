// xl:title 类声明 / 类表达式赋给常量，静态计算键
// xl:round 371
// xl:judge stdout
// xl:end
class Declared { v = 1; }
const Expr = class { v = 2; };
const key = "k" + "ey";
class WithComputed {
  static [key] = "static-value";
  [key](): string { return "method"; }
  static ["n" + 1](): string { return "n1"; }
}
const instance = new WithComputed();
console.log(new Declared().v, new Expr().v, (WithComputed as any).key, (WithComputed as any).n1(), instance.key());
