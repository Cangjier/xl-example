// xl:title 字段初始化顺序：基类先、字段按书写、静态先于实例
// xl:round 371
// xl:judge stdout
// xl:end
const log: string[] = [];
class Base {
  b1 = (log.push("b1"), 1);
  constructor() { log.push("base-ctor"); }
}
class Derived extends Base {
  d1 = (log.push("d1"), 1);
  constructor() { super(); log.push("derived-ctor"); this.d2 = (log.push("d2"), 2); }
  d2 = 0;
}
const d = new Derived();
console.log(log.join(","), d.d1, d.d2);
const log2: string[] = [];
class S { static a = (log2.push("a"), 1); static b = (log2.push("b"), 2); }
console.log(log2.join(","), S.a + S.b);
