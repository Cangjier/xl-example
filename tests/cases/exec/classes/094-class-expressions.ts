// xl:title 类表达式：匿名 / 具名自引用、立即实例化、`extends` 表达式与静态初始化
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 24 条用例——
//   · 003-class-expr-field-capture、004-new-class-expression、021-class-expression-and-name、
//     022-class-expression-constructor、033-class-expression-name-in-body-r323、
//     038-class-expression-forms、042-class-expression-name-in-body-r371、
//     044-class-expression-named、064-class-expressions
//   · exec/classes/probe-c06、probe693b-k30
//   · probe699-k-t02、t03
//   · probe704-k-c01、c02、c05、c06、c07、c08、c15、c16、c17、c18、c19
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
interface Ctor { new (n: number): { n: number } }

// 字段初始化式看得见外层变量
(() => {
  function make(k: number) {
    return class { v = k; };
  }
  console.log(new (make(5))().v);
  const outer = 7;
  const C = class { w = outer; };
  console.log(new C().w);
})();
// 被 new 的是整个类表达式
(() => {
  const v = new (class { n = 7; })();
  console.log(v.n);
  console.log(new (class { m() { return "m"; } })().m());
})();
// 具名类表达式：名字只在类体内可见
(() => {
  const C = class { m() { return "c"; } };
  const D = class Named extends C { m() { return super.m() + "D"; } };
  console.log(new C().m(), new D().m(), typeof D);
})();
// 类表达式里的 constructor：体要跑、字段初始化要在体之前
(() => {
  const K: Ctor = class { n: number; constructor(n: number) { this.n = n; } };
  console.log(new K(4).n);
  const L = class Named { n = 1; constructor(v: number) { this.n = v; } };
  console.log(new L(7).n);
  const Base = class { greet(): string { return "base"; } };
  const Derived = class extends Base { tag = "d"; constructor() { super(); this.tag = this.tag + "!"; } };
  const d = new Derived();
  console.log(d.greet(), d.tag);
})();
// 具名类表达式的名字在类体与静态初始化里可见
(() => {
  const K = class Named {
    static id = "n1";
    get tag() { return Named.id; }
    static make() { return new Named(); }
  };
  console.log(K.id, new K().tag, K.make() instanceof K);
})();
(() => {
  const A = class Self {
    static name2(): string { return Self.name; }
    who(): string { return Self.name2(); }
  };
  const B = class { static name2(): string { return typeof (this as any); } };
  console.log(new A().who(), A.name, new B() instanceof B);
  const C = class Named { static create(): Named { return new Named(); } v = 1; };
  console.log(C.create().v, C.name);
})();
(() => {
  const C = class Inner {
    static self() { return typeof Inner; }
    me() { return typeof Inner; }
  };
  console.log(C.self(), new C().me(), typeof Inner);
})();
// 类表达式的四种形状：匿名 / 具名自引用 / `extends` 表达式
(() => {
  const A = class { v = 1; };
  const B = class Named { static self(): string { return Named.name; } v = 2; };
  const Base = class { base(): string { return "b"; } };
  const C = class extends Base { extra(): string { return this.base() + "c"; } };
  const pick = true;
  const D = class extends (pick ? Base : (class {})) { };
  console.log(new A().v, new B().v, B.self(), new C().extra(), new D() instanceof Base);
})();
(() => {
  const Named = class Self { who() { return typeof Self; } };
  const inst: any = new Named();
  const anon: any = new (class { m() { return 'anon'; } })();
  try { console.log("self-name", String(inst.who())); } catch (e) { console.log("self-name", "ERR", String(e && e.name)); }
  try { console.log("anon", String(anon.m())); } catch (e) { console.log("anon", "ERR", String(e && e.name)); }
  try { console.log("name-prop", String(typeof Named.name)); } catch (e) { console.log("name-prop", "ERR", String(e && e.name)); }
  try { console.log("static-block-order", String((() => { const log: string[] = []; class K { static a = (log.push('field'), 1); static { log.push('block'); } static b = (log.push('field2'), 2); } return log.join(','); })())); } catch (e) { console.log("static-block-order", "ERR", String(e && e.name)); }
})();
// 匿名类表达式自己那一格（探针那一族）
probe(() => (new (class { constructor() { this.a = 1; } })()).a);
probe(() => (class { static m() { return 1; } }).m());
probe(() => (new (class { m() { return 2; } })()).m());
probe(() => (class { static { this.v = 5; } }).v);
probe(() => (class { x = 1 }).prototype.x);
probe(() => (new (class { x = 1 })()).x);
probe(() => (new (class A { constructor() { this.v = 1; } })()) instanceof Object);
probe(() => (new (class { m() { return typeof this; } })()).m());
probe(() => (class A { constructor() { return {}; } }) && "ok");
probe(() => (class { #p = 1; get() { return this.#p; } }) && "ok");
probe(() => void class {});
probe(() => (class A { static get x() { return 4; } }).x);
// 具名类表达式里的自引用与静态块
probe(() => (function () { const A = class B { m() { return B.name; } }; return new A().m(); })());
guard(() => {
  const Inner = class Named { static inner = Named.name; };
  return show(Inner.inner) + "|" + show(Inner.name);
});
guard(() => {
  let seen = "none";
  class Outer { static tag = "T"; }
  const C = class Inner { static { seen = Outer.tag + ":" + Inner.name; } };
  return show(seen) + "|" + show(C.name);
});
