// xl:title 类的访问器、描述符与私有成员：`get` / `set` / `super` / `#x in obj`
// xl:round 766
// xl:judge stdout
// xl:note 访问器住在原型上（自有属性表里没有）、`super` 取的是父类那一格、
// xl:note 描述符那三问（`get` / `set` / `enumerable` / `configurable`）一次钉住。
// xl:note `Object.create` 带的描述符表、`Object.getOwnPropertyDescriptors` 与
// xl:note `defineProperties` 三条路说的是同一件事（第二格是 getter 时 `JSON` 看得见它）。
// xl:note 私有那一格：静态私有 + `#p in obj`（品牌检查**不看接收者的形状**，
// xl:note 只看这一格是不是这个类装的）。
// xl:end
class A {
  #v = 1;
  get v(): number { return this.#v; }
  set v(x: number) { this.#v = x * 2; }
  has(o: any): boolean { return #v in o; }
}
class B extends A {
  get double(): number { return super.v * 2; }
  static #n = 3;
  static get n(): number { return B.#n; }
}
const b = new B();
console.log("01", b.v, b.double, B.n);
b.v = 5;
console.log("02", b.v, b.double);
const d = Object.getOwnPropertyDescriptor(A.prototype, "v");
console.log("03", typeof d!.get, typeof d!.set, d!.enumerable, d!.configurable);
console.log("04", b.has(b), b.has({}));
const proto = { greet() { return "hi"; } };
const o: any = Object.create(proto, { x: { value: 1, enumerable: true, writable: false } });
console.log("05", o.greet(), o.x, Object.keys(o).join(","));
o.x = 9;
console.log("06", o.x, Object.getPrototypeOf(o) === proto);
const t: any = { a: 1 };
Object.defineProperties(t, { b: { get() { return 2; }, enumerable: true } });
const ds = Object.getOwnPropertyDescriptors(t);
console.log("07", Object.keys(ds).join(","), ds.a.value, ds.a.writable, typeof ds.b.get, t.b);
console.log("done");
