// xl:title 形参里的解构与剩余形参：默认值、个数、长度
// xl:round 792
// xl:judge stdout
// xl:end
// **按判定点并组（第 792 轮）**：把 exec/destructuring-spread 里同一个判定点的 16 条并成这一条
// （保留 002-optional-params-and-rest-root；吸收 005-optional-and-rest-with-generics · 006-tuple-rest-element · 007-optional-and-rest-params-r331 · 009-optional-and-rest-params-r371 · 010-defaults-rest-forms · 012-optional-params-and-rest-r9 · 013-optional-and-rest-params-r676 · probe2-e06 · probe693b-d07 · probe693b-d09 · probe693b-d12 · probe693b-d13 · probe693b-d20 · probe693b-d31 · probe698-d10）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 形参位上的解构 / 默认值 / 剩余：实参少于形参给 undefined、剩余是**真数组**、`length` 数到默认值为止

// 保留条本身：002-optional-params-and-rest-root.ts
(() => {

  function f(a: number, b?: number, ...rest: number[]): string {
    return [a, b, rest.length, rest.join("")].join("/");
  }
  console.log(f(1), f(1, 2), f(1, 2, 3, 4), f(1, undefined, 5));
  const g = (x: number, y = 10) => x + y;
  console.log(g(1), g(1, 2), g(1, undefined));
})();

// 吸收 005-optional-and-rest-with-generics.ts
(() => {

  function f<T>(a: T, b?: T, ...rest: T[]): string {
    return [a, b, rest.length].join("|");
  }
  console.log(f(1), f(1, 2), f("a", "b", "c", "d"));
})();

// 吸收 006-tuple-rest-element.ts
(() => {

  type T = [string, ...number[]];
  const t: T = ["a", 1, 2];
  const [head, ...tail] = t;
  console.log(head, tail.join(","), t.length);
})();

// 吸收 007-optional-and-rest-params-r331.ts
(() => {

  function tag(name: string, prefix = "#", ...rest: string[]): string {
    return prefix + name + (rest.length > 0 ? ":" + rest.join("+") : "");
  }
  console.log(tag("a"), tag("b", "@"), tag("c", "!", "x", "y"));
})();

// 吸收 009-optional-and-rest-params-r371.ts
(() => {
  function f(a: number, b?: string, c: number = 10, ...rest: boolean[]): string {
    return [a, b, c, rest.length].join(",");
  }
  console.log(f(1), f(1, "s"), f(1, "s", 2), f(1, undefined, 2, true, false));
  console.log(f.length, ((...xs: number[]) => xs.length).length);
  function withDefault(x: number = 1, y: number = x + 1): number { return x + y; }
  console.log(withDefault(), withDefault(5), withDefault(undefined, 7));
})();

// 吸收 010-defaults-rest-forms.ts
(() => {

  function g(a = 1, ...mid: number[]) { return [a, mid.length, mid.join("-")].join(":"); }
  console.log(g(), g(5), g(5, 6, 7));
  function h(first: string, ...rest: string[]): number { return first.length + rest.length; }
  console.log(h("ab"), h("ab", "c", "d"));
  console.log([0, ...[1, 2], 3].join(","), [..."abc"].join(","));
})();

// 吸收 012-optional-params-and-rest-r9.ts
(() => {

  function f(a: number, b = a * 2, ...rest: number[]) {
    return [a, b, rest.length, arguments.length].join(",");
  }
  console.log(f(1), f(1, 2), f(1, 2, 3, 4));
  const sum = (...xs: number[]) => xs.reduce((p, c) => p + c, 0);
  console.log(sum(), sum(1, 2, 3));
})();

// 吸收 013-optional-and-rest-params-r676.ts
(() => {

  function f(a: number, b?: number, ...rest: number[]): string {
    return [a, b, rest.length].join("/");
  }
  console.log(f(1), f(1, 2), f(1, 2, 3, 4));
})();

// 吸收 probe2-e06.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = ({ a = 1 } = {}) => a; return f() + "," + f({ a: 5 }); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d07.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = ([a, b]) => a + b; return f([1, 2]); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d09.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = ({ a = 4 } = {}) => a; return f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d12.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = (...r) => r.join(","); return f(1, 2, 3); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d13.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = (a, ...r) => a + "|" + r.length; return f(1, 2, 3); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d20.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = ({ a, b } = { a: 1, b: 2 }) => a + b; return f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d31.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f(...r) { return r.length; } return f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe698-d10.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = ({ a } = { a: 9 }) => a; return f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
