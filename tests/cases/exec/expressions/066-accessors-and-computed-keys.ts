// xl:title 访问器 / 计算键 / 静态访问器 / 继承链上的访问器
// xl:round 371
// xl:judge stdout
// xl:end
const key = "computed";
class Base {
  protected backing = 1;
  get value(): number { return this.backing; }
  set value(v: number) { this.backing = v * 2; }
}
class Derived extends Base {
  [key]: string = "c";
  static get kind(): string { return "derived"; }
  get doubled(): number { return this.value * 2; }
}
const d = new Derived();
d.value = 5;
console.log(d.value, d.doubled, d.computed, Derived.kind);
console.log(Object.getOwnPropertyDescriptor(Base.prototype, "value") !== undefined);
