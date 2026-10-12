// xl:title 成员与调用链的形状（含可选链、IIFE、`this`）
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe693b-e44 · e45 · e47 · e48 · e49 · e50 · e51 · e52 · e53 · e54
//   · exec/expressions/probe693b-e55 · e56 · e57 · e58 · e59 · e61 · e63 · e65 · e66
//   · exec/expressions/probe694-m01 · m02 · m03 · m07–m14 · m35–m43（第二批）
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

// 第 787 轮并进来的第二批（`probe694-m01` · `m02` · `m03` · `m07`–`m14` · `m35`–`m43`）：
// 调用之后再调用、调用之后取成员、可选链短路时的取值（那个 `n` 是「访问器只读一次」）
probe(() => (function () { const f = function () { return function () { return 1; }; }; return f()(); })());
probe(() => (function () { const o = { f() { return { g: () => 2 }; } }; return o.f().g(); })());
probe(() => (function () { const o = { f: () => ({ g: 3 }) }; return o.f().g; })());
probe(() => (function () { const a = [function () { return 1; }]; return a[0](); })());
probe(() => (function () { const a = [() => 2]; return a["0"](); })());
probe(() => (function () { const o = { f: () => 1 }; return o["f"](); })());
probe(() => (function () { const o = { a: { b: () => 5 } }; return o.a.b(); })());
probe(() => (function () { const o = { a: { b: () => 6 } }; return o["a"]["b"](); })());
probe(() => (function () { const o = { a: { b: { c: 7 } } }; return o.a["b"].c; })());
probe(() => (function () { return (function () { return 8; })(); })());
probe(() => (function () { return (() => 9)(); })());
probe(() => (function () { const o = { f: () => 1 }; return o.f?.(); })());
probe(() => (function () { const o = { f: null }; return o.f?.(); })());
probe(() => (function () { const o = null; return o?.f; })());
probe(() => (function () { const o = { a: [1] }; return o.a?.[0]; })());
probe(() => (function () { const o = { a: null }; return o.a?.[0]; })());
probe(() => (function () { const o = { f: () => ({ g: 1 }) }; return o.f?.().g; })());
probe(() => (function () { const o = { a: { b: null } }; return o?.a?.b?.c; })());
probe(() => (function () { let n = 0; const o = { get f() { n++; return () => 1; } }; o.f?.(); return n; })());
probe(() => (function () { const f = () => ({ f: () => 2 }); return f()?.f?.(); })());
