// xl:title 类声明：继承 + 抽象式守卫 + 静态成员 + 计算名
// xl:round 9
// xl:judge stdout
// xl:end

const KEY = "dyn";
class Base {
  static kind = "base";
  id: number;
  constructor(id: number) { this.id = id; }
  describe(): string { return "base:" + this.id; }
}
class Derived extends Base {
  static kind = "derived";
  [KEY] = 1;
  tag: string;
  constructor(id: number, tag: string) { super(id); this.tag = tag; }
  describe(): string { return "derived:" + super.describe() + ":" + this.tag; }
}
const d = new Derived(1, "t");
console.log(d.describe(), Derived.kind, Base.kind, d.dyn, Object.keys(d).join(","));
