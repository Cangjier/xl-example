// xl:title 私有静态方法与私有字段
// xl:round 691
// xl:judge stdout
// xl:end
class D {
  static #n = 1;
  #m = 2;
  static get(): number { return D.#n; }
  read(): number { return this.#m; }
}
console.log(D.get(), new D().read());
