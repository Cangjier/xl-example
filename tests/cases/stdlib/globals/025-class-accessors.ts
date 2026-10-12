// xl:title 类的 getter / setter / static 访问器
// xl:round 623
// xl:judge stdout
// xl:end

class C {
  private _v = 0;
  get v() { return this._v; }
  set v(x: number) { this._v = x * 2; }
  static get tag() { return "C"; }
}
const c = new C();
c.v = 5;
console.log(c.v, C.tag);
