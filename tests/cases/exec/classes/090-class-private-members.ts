// xl:title 私有成员：`#` 字段、`#` 方法、静态私有与 `#x in o`
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 18 条用例——
//   · 067-private-static、071-private-field-read-from-method、077-private-method-call-from-method、
//     081-static-private-field-read
//   · exec/classes/probe693b-k08、k09、k10
//   · probe694-k01、k02、k04
//   · probe695-k07
//   · probe699-k-e13、e14、e15、e16、e17、e47、t07
// **同一条根上那一条 differ 的账不在这一条里**（`probe-c05` 私有名的品牌检查，单独留着）。
// 判据一行一条（`probe(f)` 与原子探针同壳）⇒ 输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const guard = (f) => {
  try {
    console.log(f());
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
const probe = (f) => guard(() => show(f()));

// 实例私有一格：同类的方法读得到
probe(() => { class A { #p = 1; get() { return this.#p; } } return new A().get(); });
probe(() => { class A { #p = 1; m() { return this.#p; } } return new A().m(); });
probe(() => { class A { #m() { return 1; } call() { return this.#m(); } } return new A().call(); });
probe(() => { class A { #m() { return 2; } call() { return this.#m(); } } return (new A().call()); });
probe(() => { class A { #x = 1; get() { return this.#x; } } return (new A().get()); });
probe(() => { class A { #x = 1; get x() { return this.#x; } } return new A().x; });
probe(() => { class A { #x = 1; get x() { return this.#x; } set x(v) { this.#x = v; } } const a = new A(); a.x = 5; return a.x; });
// 静态私有一格
probe(() => { class A { static #s = 2; static get() { return A.#s; } } return A.get(); });
probe(() => { class A { static #s = 1; static get s() { return A.#s; } } return A.s; });
probe(() => { class A { static #p = 1; static m() { return A.#p; } } return A.m(); });
probe(() => { class A { static #s = 3; static get() { return A.#s; } } return (A.get()); });
// `#x in o` 是品牌检查：同类实例为真、别处为假
probe(() => { class A { #x = 1; static has(o) { return #x in o; } } return (A.has(new A())); });
probe(() => { class A { #x = 1; has(o) { return #x in o; } } return new A().has(new A()); });
probe(() => { class A { #x = 1; static has(o) { return #x in o; } } return (A.has({})); });
probe(() => { class A { #x = 1; static has(o) { return #x in o; } } return A.has(new A()) + "," + A.has({}); });
probe(() => { class A { #x; static peek(o) { return #x in o; } } return (A.peek(Object.create(A.prototype))); });
probe(() => { class A { #x = 1; static read(o) { return o.#x; } } class B extends A {} return show(A.read(new B())); });
// 那个形状一起钉住（原 067 的正文，逐字）
(() => {
  class D {
    static #n = 1;
    #m = 2;
    static get(): number { return D.#n; }
    read(): number { return this.#m; }
  }
  console.log(D.get(), new D().read());
})();
