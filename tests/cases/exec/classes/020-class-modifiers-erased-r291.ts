// xl:title 类成员的修饰词与私有名
// xl:round 291
// xl:judge stdout
// xl:end

class C {
  private a = 1;
  protected b = 2;
  public readonly c = 3;
  static d = 4;
  #e = 5;
  sum() { return this.a + this.b + this.c + this.#e; }
  static getD() { return C.d; }
}
console.log(new C().sum(), C.getD());
