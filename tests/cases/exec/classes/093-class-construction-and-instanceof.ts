// xl:title 实例与构造：`instanceof`、`constructor` 的返回值、脱离接收者的方法调用
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 12 条用例——
//   · 085-method-call-this-binding
//   · exec/classes/probe-c07、probe2-k09、probe2-k10
//   · probe693-c17、probe693b-k01、k17、k28、k29
//   · probe699-k-e27、e35、t11
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

// 方法取下来单独调用：这一版的口径是「没有接收者」
probe(() => (function () { class A { m() { return this === undefined ? "u" : "o"; } } const f = new A().m; return f(); })());
// instanceof：直接实例、派生实例、静态工厂、`Symbol.hasInstance`、匿名类表达式
probe(() => (function () { class A { constructor() { this.a = 1; } } return (new A()) instanceof A; })());
probe(() => (function () { class A {} class B extends A {} return (new B()) instanceof A; })());
probe(() => (function () { class A { } const a = new A(); return a instanceof A; })());
probe(() => (function () { class A { } class B extends A { } return new B() instanceof A; })());
probe(() => (function () { class A { m() { return this; } } return new A().m() instanceof A; })());
probe(() => (function () { class A { static of() { return new A(); } } return A.of() instanceof A; })());
probe(() => (function () { const A = class { static [Symbol.hasInstance]() { return true; } }; return 1 instanceof A; })());
probe(() => (class A {} , (new (class B extends (class {}) {})()) instanceof Object));
probe(() => (function () { class A { } return (new (class extends A {})() instanceof A); })());
probe(() => (function () { class A {} class B extends A {} return (new B() instanceof A); })());
// 原型上的方法用 call / apply / bind 借出去
guard(() => (function () {
  class A { m() { return 1; } }
  const o = { m: () => 2 };
  return show(A.prototype.m.call(o)) + "|" + show(A.prototype.m.apply(o)) + "|" + show(A.prototype.m.bind(o)());
})());
// 构造函数返回对象时顶掉实例自己那一格
probe(() => (function () { class A { constructor() { return { z: 1 }; } } return new A().z; })());
// 方法收实参的两种写法：rest 与解构
probe(() => (function () { class A { m(...r) { return r.length; } } return new A().m(1, 2); })());
probe(() => (function () { class A { m({ a }) { return a; } } return new A().m({ a: 1 }); })());
// 方法自己那一格：生成器与 async 的返回形状
probe(() => (function () { class A { *g() { yield 1; } } return [...new A().g()].length; })());
probe(() => (function () { class A { async m() { return 1; } } return typeof new A().m().then; })());
