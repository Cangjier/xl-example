// xl:title 原型上的访问器被继承，赋值走 setter
// xl:round 623
// xl:judge stdout
// xl:end

class A {
  private _v = 1;
  get v() { return this._v; }
  set v(x: number) { this._v = x * 3; }
}
class B extends A {}
const b = new B();
b.v = 2;
console.log(b.v, Object.getOwnPropertyNames(b).join(","));
