// xl:title 成员与调用链的形状（含可选链、IIFE、`this`）
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe693b-e44 · e45 · e47 · e48 · e49 · e50 · e51 · e52 · e53 · e54
//   · exec/expressions/probe693b-e55 · e56 · e57 · e58 · e59 · e61 · e63 · e65 · e66
// 判据只有一条：**链的形状**——点号与下标两种写法落点相同、调用之后再取成员、
// 可选链只护它左边那一格、IIFE 与「逗号隔开的函数表达式」当直接调用者时 `this` 是谁。
// 语义边界（`?.` 的短路次数、访问器的读取次数）另有更细的用例：`168` / `178` / `179`。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 直接调用者：IIFE、箭头、逗号表达式
probe(() => (function () { return (() => 1)() + (function () { return 2; })(); })());
probe(() => ((x) => x + 1)(1));
probe(() => (0, function () { return 1; })());
probe(() => (function () { return (function () { return this === undefined ? "u" : typeof this; })(); })());

// 调用之后再取成员
probe(() => (function () { const f = () => ({ g: () => 7 }); return f().g(); })());
probe(() => (function () { const o = { f() { return 1; } }; return o["f"]().valueOf(); })());
probe(() => (function () { const o = { f() { return { v: 2 }; } }; return o["f"]().v; })());
probe(() => (function () { const o = { f() { return { g() { return 3; } }; } }; return o.f().g(); })());
probe(() => (function () { const f = () => () => ({ v: 1 }); return f()().v; })());

// 点号与下标两种写法
probe(() => (() => ({ a: 1 })).a);
probe(() => (function () { const a = [[1]]; return a[0][0]; })());
probe(() => (function () { const a = [[1]]; return a["0"]["0"]; })());
probe(() => (function () { const o = { a: [1, 2] }; return o.a.at(-1); })());

// 可选链：只护它左边那一格
probe(() => (function () { const o = { a: 1 }; return o?.["a"]; })());
probe(() => (function () { const o = null; return String(o?.a); })());
probe(() => (function () { const o = { f: () => 1 }; return o?.f?.(); })());
probe(() => (function () { const o = {}; return String(o.f?.()); })());
probe(() => (function () { const o = { a: { b: { c: 5 } } }; return o["a"]?.b.c; })());

// 模板嵌套
probe(() => `${`${1}`}`);
