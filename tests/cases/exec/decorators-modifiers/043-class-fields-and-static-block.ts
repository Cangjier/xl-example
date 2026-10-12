// xl:title 类字段与静态块：字段初始化顺序、静态块拿到 this
// xl:round 7
// xl:judge stdout
// xl:end

class C {
  a = 1;
  b = this.a + 1;
  static s = 10;
  static {
    C.s += 5;
    this.extra = "block";
  }
  c: number;
  constructor() { this.c = this.b + C.s; }
}
const o = new C();
console.log(o.a, o.b, o.c, C.s, (C as any).extra);
