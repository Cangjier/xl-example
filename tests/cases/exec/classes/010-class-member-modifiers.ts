// xl:title 成员修饰词全上：public / private / protected / readonly / static / override
// xl:judge stdout
// xl:end

class A {
  public a = 1;
  private b = 2;
  protected c = 3;
  readonly d = 4;
  static s = 5;
  sum(): number { return this.a + this.b + this.c + this.d + A.s; }
}
class B extends A {
  override sum(): number { return super.sum() * 10; }
  static s = 50;
}
console.log(new A().sum(), new B().sum(), B.s, A.s);
