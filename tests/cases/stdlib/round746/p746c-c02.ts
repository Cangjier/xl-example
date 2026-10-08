// xl:title 访问器与描述符：对象字面量 / 类 / `defineProperty` 三条路
// xl:round 746
// xl:judge stdout
// xl:end
const o = {
  _x: 1,
  get x() { return this._x; },
  set x(v) { this._x = v * 2; },
};
o.x = 5;
console.log(o.x, o._x, Object.keys(o).join(","));
const p: any = {};
Object.defineProperty(p, "y", { get() { return 7; }, set(v) { this._y = v; }, enumerable: true, configurable: true });
p.y = 3;
console.log(p.y, p._y, Object.keys(p).join(","));
class A { get v() { return 1; } set v(x: number) { this._v = x; } }
class B extends A { get v() { return super.v + 1; } }
const b = new B();
console.log(b.v);
b.v = 9;
console.log(b._v);
const ad = Object.getOwnPropertyDescriptor(A.prototype, "v") as any;
console.log(typeof ad.get, typeof ad.set, ad.enumerable, ad.configurable);
const dd = Object.getOwnPropertyDescriptor({ a: 1 }, "a") as any;
console.log(dd.value, dd.writable, dd.enumerable, dd.configurable);
const q: any = { a: 1 };
const qd = Object.getOwnPropertyDescriptor(q, "a") as any;
console.log(qd.value, Object.getOwnPropertyDescriptor(q, "zz") === undefined);
const made = Object.create({ p1: 1 }, { a: { value: 2, enumerable: true } });
console.log(made.a, made.p1, Object.keys(made).join(","));
console.log(JSON.stringify(Object.getOwnPropertyNames(Object.create({}, { x: { value: 1 } }))));
