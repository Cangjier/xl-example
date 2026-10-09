// xl:title 访问器成员与可枚举性：__lookupGetter__ / __defineGetter__ / enumerable
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 19 条探针
// （p706a-o09 · p706b-g01 · p706b-g02 · p706b-g03 · p706b-g04 · p706b-g06 · p706b-g07 · p706b-g08 · p706c-x19 · p706c-x20 · p706c-x21 · p706c-x22 · p706c-x23 · p706c-x24 · p706c-x25 · p706c-x26 · p706c-x27 · p706d-y04 · p706a-p06）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 访问器一族的老四格与 getter 名字、原型上的查找、enumerable 那一格；字符串的自有格

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-o09.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, configurable: true });
  console.log(show(o.__lookupGetter__("x").name));
})();

// 吸收 p706b-g01.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, configurable: true });
  console.log(show(typeof o.__lookupGetter__));
})();

// 吸收 p706b-g02.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, configurable: true });
  const g = o.__lookupGetter__("x");
  console.log(show(typeof g));
})();

// 吸收 p706b-g03.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, configurable: true });
  console.log(show(Object.getOwnPropertyDescriptor(o, "x").get.name));
})();

// 吸收 p706b-g04.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, configurable: true });
  const g = Object.getOwnPropertyDescriptor(o, "x").get;
  console.log(show(g.length) + "," + show(g.call(o)));
})();

// 吸收 p706b-g06.ts（第 706 轮）
(() => {
  const o = { get x() { return 1; } };
  console.log(show(Object.getOwnPropertyDescriptor(o, "x").get.name));
})();

// 吸收 p706b-g07.ts（第 706 轮）
(() => {
  class A { get x() { return 1; } }
  console.log(show(Object.getOwnPropertyDescriptor(A.prototype, "x").get.name));
})();

// 吸收 p706b-g08.ts（第 706 轮）
(() => {
  const o = { m() {} };
  console.log(show(o.m.name));
})();

// 吸收 p706c-x19.ts（第 706 轮）
(() => {
  const b = Object.prototype;
  console.log(show(typeof b["__lookupGetter__"]) + "," + show(typeof b["__lookupSetter__"]) + "," + show(typeof b["__defineGetter__"]) + "," + show(typeof b["__defineSetter__"]));
})();

// 吸收 p706c-x20.ts（第 706 轮）
(() => {
  console.log(show(Object.prototype.__lookupGetter__.name) + "," + show(Object.prototype.__lookupGetter__.length));
})();

// 吸收 p706c-x21.ts（第 706 轮）
(() => {
  const o = {}; o.__defineGetter__("x", function () { return 1; });
  console.log(show(o.x) + "," + show(Object.keys(o).join("|")));
})();

// 吸收 p706c-x22.ts（第 706 轮）
(() => {
  const o = {}; o.__defineSetter__("x", function (v) { this.y = v; }); o.x = 5;
  console.log(show(o.y) + "," + show(Object.keys(o).join("|")));
})();

// 吸收 p706c-x23.ts（第 706 轮）
(() => {
  const o = { a: 1 };
  console.log(show(o.__lookupGetter__("a")));
})();

// 吸收 p706c-x24.ts（第 706 轮）
(() => {
  const p = { get g() { return 1; } }; const o = Object.create(p);
  console.log(show(o.__lookupGetter__("g")));
})();

// 吸收 p706c-x25.ts（第 706 轮）
(() => {
  const o = {}; run(() => { o.__defineGetter__("x", 5); });
})();

// 吸收 p706c-x26.ts（第 706 轮）
(() => {
  const o = {}; o.__defineGetter__("x", function () { return 1; });
  console.log(show(Object.getOwnPropertyDescriptor(o, "x").get.name));
})();

// 吸收 p706c-x27.ts（第 706 轮）
(() => {
  run(() => { console.log(show(Object.prototype.__lookupGetter__.call(null, "x"))); });
})();

// 吸收 p706d-y04.ts（第 706 轮）
(() => {
  const o = {}; Object.defineProperty(o, "z", { value: 1, enumerable: true });
  console.log(show(Object.keys(o).join("|")));
})();

// 吸收 p706a-p06.ts（第 706 轮）
(() => {
  console.log(show("ab".hasOwnProperty("length")) + "," + show("ab".hasOwnProperty(0)) + "," + show("ab".hasOwnProperty("1")));
})();
