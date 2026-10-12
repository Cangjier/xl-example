// xl:title 计算属性名：类字段 / 方法 / 静态
// xl:round 623
// xl:judge stdout
// xl:end

const k = "a" + "b";
class C {
  [k] = 1;
  static [k + "s"] = 2;
  ["m" + "1"]() { return this.ab; }
}
console.log(new C().ab, (C as any).abs, new C().m1());
