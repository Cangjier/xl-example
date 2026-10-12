// xl:title 私有成员：#m() / #n / static #s / #x in o
// xl:judge stdout
// xl:end

class C {
  #n = 1;
  static #s = 2;
  #m(): number { return this.#n + C.#s; }
  has(o: any): boolean { return #n in o; }
  value(): number { return this.#m(); }
}
const c = new C();
console.log(c.value(), c.has(c), c.has({}));
