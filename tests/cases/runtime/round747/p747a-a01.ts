// xl:title 类：字段 / 静态块 / 私有字段 / `instanceof` / 继承初始化次序
// xl:round 747
// xl:judge stdout
// xl:end
class A {
  a = 1;
  static s = 2;
  static { A.s = 5; }
  #p = 3;
  constructor() { (this as any).b = 4; }
  getP() { return this.#p; }
  has(o: any) { return #p in o; }
}
const x = new A();
console.log(x.a, (x as any).b, A.s, x.getP(), x.has(x), x.has({}));
console.log(x instanceof A, Object.keys(x).join(","));
class B extends A { c = 9; constructor() { super(); (this as any).d = 10; } }
const y = new B();
console.log(y.a, (y as any).b, (y as any).c, (y as any).d, y instanceof A, y instanceof B);
