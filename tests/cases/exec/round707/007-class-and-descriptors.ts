// xl:title 类与属性描述符：静态继承、super、缺省构造、访问器、私有字段、`for..in` 与定义属性
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 16 条探针
// （`p707b-c01` … `p707b-c08` · `p707b-d01` … `p707b-d08`）。正文逐字搬进各自的 IIFE。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 类：静态 / super / 缺省构造 / 访问器 / 私有 / 静态块
(() => {
  class A { static m() { return "A"; } }
  class B extends A {}
  console.log(show(B.m()));
})();
(() => {
  class A { constructor(x) { this.x = x; } }
  class B extends A { constructor() { super(1); this.y = 2; } }
  console.log(show(JSON.stringify(new B())));
})();
(() => {
  class A { constructor() { this.t = "a"; } }
  class B extends A {}
  console.log(show(new B().t));
})();
(() => {
  class A { get v() { return this._v; } set v(x) { this._v = x * 2; } }
  const a = new A(); a.v = 3;
  console.log(show(a.v) + "," + show(Object.keys(a).join("|")));
})();
(() => {
  class A {} class B extends A {}
  console.log(show(new B() instanceof A) + "," + show(new A() instanceof B));
})();
(() => {
  const C = class Named { static who() { return Named.name; } };
  console.log(show(C.name) + "," + show(C.who()));
})();
(() => {
  class A { #x = 1; get x() { return this.#x; } set x(v) { this.#x = v; } }
  const a = new A(); a.x = 5;
  console.log(show(a.x) + "," + show(Object.keys(a).length));
})();
(() => {
  class A { static a = 1; static { this.b = this.a + 1; } }
  console.log(show(A.a) + "," + show(A.b));
})();
// 属性描述符：访问器、不可配置、不可写、数组 length、getter / setter 的名字
(() => {
  const o = {}; Object.defineProperty(o, "g", { get() { return 1; }, enumerable: true });
  console.log(show(o.g) + "," + show(Object.keys(o).join("|")));
})();
(() => {
  const o = { get x() { return 1; } };
  o.x = 5;
  console.log(show(o.x));
})();
(() => {
  const o = {}; Object.defineProperty(o, "x", { get() { return 3; }, configurable: true });
  console.log(show(o.x) + "," + show(Object.getOwnPropertyDescriptor(o, "x").set));
})();
(() => {
  const o = {}; Object.defineProperty(o, "x", { value: 1, configurable: false });
  run(() => { Object.defineProperty(o, "x", { value: 2 }); });
})();
(() => {
  "use strict" === "" ;
  const o = {}; Object.defineProperty(o, "x", { value: 1, writable: false });
  run(() => { o.x = 2; console.log(show(o.x)); });
})();
(() => {
  const a = [1, 2, 3];
  run(() => { Object.defineProperty(a, "length", { value: 1 }); console.log(show(a.length) + "," + show(a[1])); });
})();
(() => {
  const o = { get x() { return 1; }, set x(v) {} };
  const d = Object.getOwnPropertyDescriptor(o, "x");
  console.log(show(d.get.name) + "," + show(d.set.name));
})();
// `for..in` 沿原型链且去重
(() => {
  const p = { a: 1, b: 2 }; const o = Object.create(p); o.b = 3; o.c = 4;
  const out = []; for (const k in o) out.push(k + "=" + o[k]);
  console.log(show(out.join("|")));
})();
