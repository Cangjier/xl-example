// xl:title 类里的计算成员：静态计算名、getter 计算名、私有与计算名混用
// xl:round 7
// xl:judge stdout
// xl:end

const key = "dyn";
const tag = Symbol("t");
class C {
  static [key] = "static-dyn";
  [key](): string { return "method-dyn"; }
  get [`g${1}`](): string { return "getter1"; }
  [tag] = "symbol-field";
  read(v: any): any { return v[tag]; }
}
const c: any = new C();
console.log((C as any)[key], c[key](), c.g1, c.read(c), typeof c[tag]);
