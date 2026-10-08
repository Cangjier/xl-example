// xl:title 私有字段不是自有属性名（`getOwnPropertyNames` 与 `keys` 同口径）
// xl:round 737
// xl:judge stdout
// xl:end
class A {
  #p = 1;
  static #sp = 2;
  #m() { return this.#p + 1; }
  run() { return this.#m(); }
  static getSp() { return A.#sp; }
}
const a = new A();
console.log("names:" + Object.getOwnPropertyNames(a).join(","));
console.log("keys:" + Object.keys(a).join(","), JSON.stringify(a));
console.log(Object.getOwnPropertyNames(A.prototype).join(","), a.run(), A.getSp());
const o: any = { "#p": 9 };
console.log(Object.getOwnPropertyNames(o).length, Object.keys(o).length);
