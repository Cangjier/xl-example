// xl:title 符号键的访问器与计算名字段
// xl:round 651
// xl:judge stdout
// xl:end

const k = Symbol("k");
class Box {
  private store: number[] = [];
  get [k](): number { return this.store.length; }
  set [k](v: number) { this.store.push(v); }
  ["m" + "1"](): string { return "m1"; }
}
const b = new Box();
b[k] = 1;
b[k] = 2;
console.log(b[k], b.m1(), Object.getOwnPropertySymbols(b).length);
