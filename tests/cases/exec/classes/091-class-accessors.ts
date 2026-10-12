// xl:title 访问器：读写的落点、`super` 那一侧、只读那一档与现读的次数
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 20 条用例——
//   · 009-getter-setter-class、015-getter-setter-inheritance-chain（与 017 逐字相同）、
//     017-getter-in-class-and-inherit-chain、040-getter-setter-with-types、046-getter-inherit、
//     049-super-and-accessors、055-getter-setter-inheritance、068-getter-setter-inherit、
//     083-accessor-pair-backing-field
//   · exec/classes/p-class-accessor-literal、p-class-super-getter
//   · probe693-c26、c27、c28、c49、c50 · probe695-k01、k02 · probe2-k07 · probe699-k-e34
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

// 取值器 / 设值器各自住在类体里，读写分派到各自那一格
(() => {
  class A { get v(): number { return 1; } set v(x: number) { console.log("A set", x); } }
  class B extends A { get v(): number { return super.v + 1; } }
  const b = new B();
  console.log(b.v);
  b.v = 5;
})();
// 三层继承里每一层各加一格
(() => {
  class A { get v() { return 1; } }
  class B extends A { get v() { return super.v + 10; } }
  class C extends B { get v() { return super.v + 100; } }
  console.log(new A().v, new B().v, new C().v);
})();
// 带类型标注的访问器、只读属性，以及对象字面量里的访问器
(() => {
  class Temp {
    private _c = 0;
    get celsius(): number { return this._c; }
    set celsius(v: number) { this._c = v; }
    get fahrenheit(): number { return this._c * 9 / 5 + 32; }
    readonly id: string = "t1";
  }
  const t = new Temp();
  t.celsius = 100;
  console.log(t.celsius, t.fahrenheit, t.id);
  const lit = { get v(): number { return 3; }, set v(_x: number) {} };
  console.log(lit.v);
})();
// 继承来的访问器：赋值走 setter，自有名表里不留那一格
(() => {
  class A {
    private _v = 1;
    get v() { return this._v; }
    set v(x: number) { this._v = x * 3; }
  }
  class B extends A {}
  const b = new B();
  b.v = 2;
  console.log(b.v, Object.getOwnPropertyNames(b).join(","));
})();
// `super` 那一侧的读与写
(() => {
  class Base {
    #tag = "base";
    get label(): string { return "L:" + this.#tag; }
    set label(v: string) { this.#tag = v; }
    who(): string { return "base"; }
  }
  class Sub extends Base {
    override get label(): string { return super.label + "!"; }
    override set label(v: string) { super.label = v.toUpperCase(); }
    override who(): string { return super.who() + "/sub"; }
  }
  const s = new Sub();
  console.log(s.label, s.who());
  s.label = "x";
  console.log(s.label, s.who());
})();
(() => {
  class A { get v() { return 1; } set v(x: number) { console.log("A set", x); } }
  class B extends A { get v() { return super.v + 10; } set v(x: number) { super.v = x * 2; } }
  const b = new B();
  console.log(b.v);
  b.v = 3;
})();
(() => {
  class A { get v(): number { return 1; } set v(x: number) { console.log("set", x); } }
  class B extends A { get w(): number { return super.v + 10; } }
  const b: any = new B();
  console.log(b.v, b.w);
  b.v = 5;
  console.log(Object.getOwnPropertyDescriptor(A.prototype, "v")!.get!.name);
})();
// 访问器对与背后那一格
probe(() => { class A { set v(x) { this._x = x; } get v() { return this._x; } } const a = new A(); a.v = 3; return a.v; });
probe(() => { class A { get x() { return 1; } set x(v) { this._v = v; } } const a = new A(); a.x = 5; return a.x + "," + a._v; });
(() => {
  const o = {
    get x() {
      return 1;
    },
    set x(v) {
      this._v = v;
    },
  };
  o.x = 5;
  console.log(o.x, o._v);
})();
(() => {
  class A {
    get x() {
      return 1;
    }
  }
  class B extends A {
    get x() {
      return super.x + 1;
    }
  }
  console.log(new B().x);
})();
// 对象字面量上的访问器：不枚举、设值器那一侧落在哪个键上
probe(() => { const o = { get a() { return 1; } }; return Object.keys(o).length + "," + o.a; });
probe(() => { const o = { set a(v) { this.b = v; } }; o.a = 2; return o.b + "," + Object.keys(o).join(","); });
probe(() => { const o = { _v: 1, get v() { return this._v; }, set v(x) { this._v = x; } }; o.v = 5; return o.v; });
probe(() => { class A { set v(x) { this._v = x; } get v() { return this._v + 1; } } const a = new A(); a.v = 1; return a.v; });
probe(() => { class A { get v() { return this._v = 1; } } return new A().v; });
probe(() => { class A { get g() { return 1; } set g(v) { this.v = v; } } const a = new A(); a.g = 2; return (a.v); });
// 读那一趟必须**现读**，读几次算几次
probe(() => { let n = 0; const o = { get a() { n++; return 1; } }; return [o.a, o.a, n].join(","); });
probe(() => { const o = {}; let v = 0; Object.defineProperty(o, "a", { get() { return ++v; }, configurable: true }); return o.a + o.a; });
