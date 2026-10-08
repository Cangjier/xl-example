// xl:title 私有字段 / 私有方法 / `#x in o` / 静态私有
// xl:round 736
// xl:judge stdout
// xl:end
class A {
  #p = 1;
  static #sp = 2;
  #m() { return this.#p + 1; }
  has(o: any) { return #p in o; }
  run() { return this.#m(); }
  static getSp() { return A.#sp; }
}
const a = new A();
console.log(a.run(), a.has(a), a.has({}), A.getSp());
console.log(Object.getOwnPropertyNames(a).join(","));
console.log(Object.getOwnPropertyNames(A.prototype).join(","), typeof (a as any).run);
