// xl:title 私有实例方法 + 私有静态字段一起用
// xl:round 305
// xl:judge stdout
// xl:end

class C {
  #secret = 1;
  static #count = 0;
  #inc(): number { return ++this.#secret; }
  static bump(): number { return ++C.#count; }
  run(): number { return this.#inc(); }
}
const c = new C();
console.log(c.run(), C.bump(), C.bump());
