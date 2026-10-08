// xl:title super：构造、方法、静态方法、访问器、属性写
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Base {
  v = 1;
  constructor(public tag: string) {}
  get doubled(): number { return this.v * 2; }
  m(): string { return "base" + this.tag; }
  static s(): string { return "S"; }
}
class Derived extends Base {
  extra = 2;
  constructor() { super("d"); this.v = 3; }
  m(): string { return super.m() + "/derived"; }
  static s(): string { return super.s() + "D"; }
  get total(): number { return super.doubled + this.extra; }
}
const d = new Derived();
console.log(d.tag, d.v, d.m(), Derived.s(), d.total);
