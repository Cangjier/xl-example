// xl:title 类字段：初始化式、顺序、可选、确定赋值、静态块顺序
// xl:round 371
// xl:judge stdout
// xl:end
const log: string[] = [];
class Ordered {
  static s1 = (log.push("s1"), 1);
  a = (log.push("a"), 1);
  static { log.push("block"); }
  static s2 = (log.push("s2"), 2);
  b = (log.push("b"), this.a + 1);
  c?: number;
  d!: string;
  constructor() { this.d = "d"; }
}
const o = new Ordered();
console.log(log.join(","), o.a, o.b, o.c, o.d, Ordered.s1 + Ordered.s2);
