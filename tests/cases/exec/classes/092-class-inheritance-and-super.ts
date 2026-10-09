// xl:title 继承与 `super`：构造器传参、方法 / 静态 / 访问器上的 `super`、原型链
// xl:round 788
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 24 条用例——
//   · 007-super-forms-root、037-super-forms-r371、045-super-inheritance、
//     065-super-forms-r683、070-function-class-a-m-return-1-…、072-…get-v-…、
//     075-function-class-a-get-v-return-1-return-new-a-v
//   · exec/classes/probe2-k03
//   · probe693b-k11、k12、k13、k15、k16、k32
//   · probe694-k11、k12、k14、k15
//   · probe696-k06
//   · probe699-k-e07、e09、e26、t08、t15
// 判据一段一条（吸收进来的多语句正文逐字保留在自己的 IIFE 里，输出逐行不变）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const guard = (f) => {
  try {
    console.log(f());
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
const probe = (f) => guard(() => show(f()));

// `super` 的三种用法：构造、方法、方法带展开
(() => {
  class A {
    n: number;
    constructor(n: number) { this.n = n; }
    m(...xs: number[]): number { return xs.length + this.n; }
  }
  class B extends A {
    constructor() { super(10); }
    m(...xs: number[]): number { return super.m(...xs) * 2; }
    other(): number { return super.m(1, 2, 3); }
  }
  const b = new B();
  console.log(b.n, b.m(1, 2), b.other());
})();
// 构造 / 方法 / 静态方法 / 访问器 / 属性写，五处一起
(() => {
  class Base {
    v = 1;
    constructor(public tag: string) {}
    get doubled(): number { return this.v * 2; }
    m(): string { return "base" + this.tag; }
    static s(): string { return "S"; }
  }
  class Derived extends Base {
    extra = 2;
    constructor() { super("d"); this.v = 3; }
    m(): string { return super.m() + "/derived"; }
    static s(): string { return super.s() + "D"; }
    get total(): number { return super.doubled + this.extra; }
  }
  const d = new Derived();
  console.log(d.tag, d.v, d.m(), Derived.s(), d.total);
})();
(() => {
  class A {
    constructor(public v: number) {}
    m() { return "A" + this.v; }
    static s() { return "SA"; }
    get g() { return 1; }
  }
  class B extends A {
    constructor() { super(2); }
    m() { return "B" + super.m(); }
    static s() { return "SB" + super.s(); }
    get g() { return super.g + 1; }
  }
  const b = new B();
  console.log(b.m(), B.s(), b.g, b.v);
})();
(() => {
  class B { v: number; constructor(v: number) { this.v = v; } m(x: number): number { return this.v + x; } get g(): number { return this.v * 2; } }
  class S extends B { constructor(...args: number[]) { super(args[0] + 1); } m(x: number): number { return super.m(x) + 1; } get g(): number { return super.g + 1; } }
  const s: any = new S(1);
  try { console.log("ctor-args", String(s.v)); } catch (e) { console.log("ctor-args", "ERR", String(e && e.name)); }
  try { console.log("method-super", String(s.m(2))); } catch (e) { console.log("method-super", "ERR", String(e && e.name)); }
  try { console.log("getter-super", String(s.g)); } catch (e) { console.log("getter-super", "ERR", String(e && e.name)); }
  try { console.log("super-in-static", String((() => { class A { static k() { return 'A'; } } class B2 extends A { static k() { return 'B' + super.k(); } } return B2.k(); })())); } catch (e) { console.log("super-in-static", "ERR", String(e && e.name)); }
})();
// 探针那一族：都不带 try/catch（原来就在壳里）
probe(() => (function () { class A { m() { return 1; } } class B extends A { m() { return super.m() + 1; } } return new B().m(); })());
probe(() => (function () { class A { get v() { return 1; } } class B extends A { get v() { return super.v + 1; } } return new B().v; })());
probe(() => (function () { class A { get v() { return 1; } } return new A().v; })());
probe(() => (function () { class A { constructor(x) { this.x = x; } } class B extends A {} return new B(5).x; })());
probe(() => (function () { class A { } class B extends A { constructor() { super(); this.b = 1; } } return new B().b; })());
probe(() => (function () { class A { constructor(x) { this.x = x; } } class B extends A { constructor() { super(5); } } return new B().x; })());
probe(() => (function () { class A { m() { return "a"; } } class B extends A { m() { return super.m() + "b"; } } return new B().m(); })());
probe(() => (function () { class A { constructor() { this.a = 1; } } class B extends A { constructor() { super(); this.b = 2; } } return Object.keys(new B()).join(","); })());
probe(() => (function () { class A { } class B extends A { constructor() { super(); this.y = 1; } } return Object.keys(new B()).join(","); })());
probe(() => (function () { class A { get v() { return 1; } } class B extends A { m() { return super.v; } } return new B().m(); })());
probe(() => (function () { class A { } class B extends A { constructor() { super(); super.x = 1; } } return new B().x; })());
probe(() => (function () { class A { constructor() { this.x = 1; } } class B extends A { constructor() { super(); this.y = 2; } } const b = new B(); return b.x + b.y; })());
probe(() => (function () { class A { m() { return 1; } } class B extends A { m() { return super.m() + 1; } } return (new B().m()); })());
probe(() => (function () { class A { get g() { return 3; } } class B extends A { get g() { return super.g + 1; } } return (new B().g); })());
probe(() => (function () { class A { m() { return super.toString ? "has" : "no"; } } return new A().m(); })());
// 原型链那两格
probe(() => (function () { class A { } class B extends A { } return Object.getPrototypeOf(B) === A; })());
probe(() => (function () { class A { } class B extends A { } return Object.getPrototypeOf(B.prototype) === A.prototype; })());
// 字段覆盖之后 `super.x` 读的是基类那一格
guard(() => (function () { class A { x = 1; } class B extends A { x = 2; m() { return super.x; } } return show(new B().m()) + "|" + show(new B().x); })());
// 取值器覆盖：自有那一格与自己原型上那一格
guard(() => (function () { class A { get x() { return 1; } } class B extends A { get x() { return 2; } } return show(new B().x) + "|" + show(Object.getOwnPropertyDescriptor(B.prototype, "x").get !== undefined); })());
