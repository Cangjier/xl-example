// xl:title 静态计算键字段 + 实例计算键方法
// xl:round 305
// xl:judge stdout
// xl:end

const KEY = "kind";
class C {
  static [KEY] = "c";
  [KEY](): string { return "m"; }
}
console.log(C.kind, new C().kind());
