// xl:title 类的 #私有字段 / #私有方法 / static #
// xl:round 623
// xl:judge stdout
// xl:end

class C {
  static #n = 1;
  #m = 2;
  #inc() { return this.#m + 1; }
  static get() { return C.#n; }
  run() { return this.#inc(); }
}
console.log(C.get(), new C().run());
