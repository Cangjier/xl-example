// xl:title 类里的计算成员名（symbol 与表达式）
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("m");
class C {
  [s](): string {
    return "sym-method";
  }
  ["plain" + ""](): string {
    return "plain-method";
  }
}
const c = new C();
console.log((c as any)[s](), (c as any).plain());
console.log(Object.getOwnPropertyNames(C.prototype).join(","));
