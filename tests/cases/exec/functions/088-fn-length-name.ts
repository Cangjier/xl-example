// xl:title 函数的 `length` 与 `name`（用户写的那几档与内建回给的那几档）
// xl:round 682
// xl:judge stdout
// xl:end
// 第 787 轮把这一族**同一个判定点被逐批重抄**的条并成这一条（正文逐句搬入）：
//   · exec/functions/092-function-length-name · 097-function-f-name · 098-function-a-b-length
//   · exec/functions/099-length · 100-function-a-b-1-length · 103-function-bind-null-name
//   · exec/functions/107-function-name · 108-function-f-a-b-length · 110-m-m-name
//   · exec/functions/111-function-bind-null-length
//   · exec/expressions/probe694-m19 · m20 · m21 · m60
//   · exec/classes/probe693-c08 · c11 · exec/functions/probe703-f-g03 · g19
//   （后两组是**逐字节相同**的两对：`(() => {}).name` 与 `(function (...a) {}).length`）
// 判据只有一条：函数对象自己那两格——`length` 数到**第一个默认值或剩余参数**为止、
// `name` 取推断出来的名字（匿名给 `""`、绑定给 `"bound "` 前缀）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 用户写的那几档：声明 / 默认值 / 剩余参数 / 箭头 / 方法
function two(a: number, b: number) { return a + b; }
function def(a: number, b: number = 1, ...rest: number[]) { return a + b; }
const arrowed = (x: number, y: number, z: number) => x + y + z;
const obj2: any = { m(q: number) { return q; } };
probe(() => two.length);
probe(() => def.length);
probe(() => arrowed.length);
probe(() => obj2.m.length);
probe(() => [two.name, def.name, arrowed.name, obj2.m.name].join(","));

function fa(x: any): void {}
function fb(x: any = 1): void {}
function fc(...xs: any[]): void {}
const fd = (x: any, y: any = 2) => {};
probe(() => fa.length);
probe(() => fb.length);
probe(() => fc.length);
probe(() => fd.length);
probe(() => [fa.name, fd.name].join(","));

// 匿名与具名函数表达式
probe(() => (function () {}).name);
probe(() => (function f() {}).name);
probe(() => (function (a, b) {}).length);
probe(() => (function f(a, b) {}).length);
probe(() => (function (a, b = 1) {}).length);
probe(() => (function (...a) {}).length);
probe(() => (() => {}).name);
probe(() => (() => {}).length);

// 对象字面量里的方法：名字取键名
probe(() => ({ m() {} }).m.name);
probe(() => { const o = { f: function () { return 1; } }; return o.f.name; });
probe(() => { const o = { f: function g() { return 1; } }; return o.f.name; });
probe(() => { const o = { f: () => 1 }; return o.f.length; });
// 赋值推断出来的名字，以及两参箭头（第 788 轮从 exec/classes 搬进来的两条独有断言；
// 同批 `probe693-c05…c10` 的断言这里逐条已有，只删不搬）
probe(() => { const f = function () { }; return f.name; });
probe(() => ((a, b) => a).length);

// `bind` 之后：名字带前缀、长度照旧是绑定后的形参个数
probe(() => (function () {}).bind(null).name);
probe(() => (function () {}).bind(null).length);
