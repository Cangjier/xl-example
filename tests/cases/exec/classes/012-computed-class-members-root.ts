// xl:title 类里的计算成员名：方法 / 访问器 / 静态
// xl:judge stdout
// xl:end

const m = "run";
const g = "val";
class C {
  [m](): number { return 1; }
  get [g](): number { return 2; }
  static ["make"](): string { return "s"; }
}
console.log(new C().run(), (new C() as any).val, C.make(), Object.getOwnPropertyNames(C.prototype).join(","));
