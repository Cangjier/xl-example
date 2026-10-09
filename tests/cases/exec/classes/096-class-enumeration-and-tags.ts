// xl:title 枚举与渲染：`Object.keys` / `entries` / `JSON.stringify` / `toString` / `Symbol.toStringTag` / 迭代
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 19 条用例——
//   · 084-class-symbol-iterator
//   · exec/classes/probe693-c25、c31、c37、c38、c39、c45、c46
//   · probe693b-k31 · probe695-k08、k15、k16、k17、k18
//   · probe2-k11 · probe699-k-e42、t13
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

// 类实例的枚举面：字段进得去、访问器与原型成员进不去
probe(() => (function () { class A { } return JSON.stringify(new A()); })());
probe(() => (function () { class A { a = 1; } return JSON.stringify(new A()); })());
probe(() => (function () { class A { get a() { return 1; } } return JSON.stringify(new A()); })());
probe(() => (function () { class A { get a() { return 1; } } return Object.entries(new A()).length; })());
// `toString` 与模板串都走用户写的那一格
probe(() => (function () { class A { toString() { return "A"; } } return `${new A()}`; })());
probe(() => (function () { class A { toString() { return "A!"; } } return String(new A()); })());
probe(() => (function () { class A { toString() { return 'A!'; } } return (`${new A()}`); })());
// `Symbol.toStringTag`
probe(() => (function () { class A { get [Symbol.toStringTag]() { return "X"; } } return Object.prototype.toString.call(new A()); })());
probe(() => (function () { class A { get [Symbol.toStringTag]() { return "T"; } } return Object.prototype.toString.call(new A()); })());
guard(() => {
  class A { }
  A.prototype[Symbol.toStringTag] = "Custom";
  return show(Object.prototype.toString.call(new A())) + "|" + show(String(new A()).startsWith("[object"));
});
// 迭代协议
probe(() => (function () {
  class A {
    [Symbol.iterator]() {
      let i = 0;
      return { next: () => ({ value: i++, done: i > 2 }) };
    }
  }
  return [...new A()].join(",");
})());
// 对象字面量那一侧的枚举：展开、剩余、解构默认值、原型读
probe(() => (function () { const o = Object.create({ a: 1 }); return Object.getPrototypeOf(o).a; })());
probe(() => (function () { const o = { a: 1, ...{ b: 2 } }; return Object.keys(o).join(","); })());
probe(() => (function () { const o = { ...null, ...undefined, a: 1 }; return Object.keys(o).join(","); })());
probe(() => (function () { const { a, ...r } = { a: 1, b: 2 }; return JSON.stringify(r); })());
probe(() => (function () { const o = { a: 1 }; const { a = 2 } = o; return a; })());
probe(() => (function () { const o = { a: null }; const { a = 2 } = o; return a; })());
// 形参与解构那一族（原先散在 classes 里的几条）
probe(() => (function () { const f = (a = 1, b = a + 1) => a + b; return f(); })());
probe(() => (function () { function f({ a = 1, ...r } = {}) { return a + Object.keys(r).length; } return f({ b: 1 }); })());
probe(() => (function () { const [a = 1, b = 2] = [undefined]; return a + b; })());
probe(() => (function () { const { a: { b } = { b: 2 } } = {}; return b; })());
probe(() => (function () { const f = (a, ...r) => a + r.length; return f(1, 2, 3); })());
