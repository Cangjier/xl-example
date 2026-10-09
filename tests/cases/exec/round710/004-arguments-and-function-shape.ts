// xl:title `arguments` 与函数自己的形状：长度与取值、箭头没有自己的、严格与松散、自有名表
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round710` 里逐条一问的 6 条探针
// （`p710d-d01` … `p710d-d06`）。正文逐字搬进自己的 `probe(f)` 小壳。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => (function () { function f(this: any, a: any) { return arguments.length + "," + arguments[0]; } return f(1); })());
probe(() => (function () { function f() { const g = () => typeof arguments; return g(); } return f(1); })());
probe(() => (function () { return { m() { return arguments.length; } }.m(1, 2); })());
probe(() => (function () { function f(this: any) { "use strict"; return Array.isArray(arguments); } function g() { return Array.isArray(arguments); } return f(1) + "," + g(1); })());
probe(() => Object.getOwnPropertyNames(function f() {}).join(",") === Object.getOwnPropertyNames(function () {}).join(","));
probe(() => { class A { m() { function inner() { return 1; } return Object.getOwnPropertyNames(inner).join(","); } } return new A().m(); });
