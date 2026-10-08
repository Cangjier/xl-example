// xl:title 类的计算成员名 + 静态私有 + 访问器
// xl:round 8
// xl:judge stdout
// xl:end

const key = "k" + 1;
class C {
  static #hidden = 5;
  [key] = 1;
  get v() { return this[key] + C.#hidden; }
  set v(n) { this[key] = n; }
  static read() { return C.#hidden; }
}
const c = new C();
console.log(c.v, C.read(), c.k1);
c.v = 10;
console.log(c.v, c.k1);
