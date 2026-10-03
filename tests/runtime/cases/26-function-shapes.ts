// 语料 26：函数那一半的另外两条（第 134 轮）——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 133 轮收尾时量出两条「普通代码里遍地都是」的缺口，
// 这一轮把两条都修掉了——而**两条都不在降级层** ✓：
//
//   ① **函数声明写在函数表达式 / 箭头函数的体里** ✗
//      `function () { function f() { … } }` 报 `unimplemented: statement FunctionExpression` ✓。
//      根因在**投影层**：`ctx.expressionPosition` 是「**这一个**节点在表达式位」的标记 ✓，
//      而它被**漏进了子树** ✗——匿名 IIFE 只有一个子单元，于是标记一路漏到体里 ✓，
//      把体里那条**声明**投成了表达式 ✗。带名字的函数有两个子单元，所以这条一直没露 ✓。
//   ② **`f()()`（调用结果再调用）** ✗：产物把 `f()()` 收成了**一个** `f()` ✓——
//      `Method` 那两条判据只认「前一单元是标识符」与「前一单元是括号」✓，
//      而 `f()` 收成一个 `Method` 之后**两者都不是** ✗。所以这条**只在实参位**露出来 ✓
//      （`const a = f()();` 走另一条重组规则、一直是对的 ✓）。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · `{a, ...rest}`（对象剩余）—— 要一份排除名单，引擎侧没有这条路 ✓（降级期响亮地抛 ✓）；
//   · `new C(...xs)` / `super(...xs)` / `super.m(...xs)` —— 第 133 轮记着的三条 ✓；
//   · 解构形参里的**对象剩余**（`function f({a, ...rest})`）—— 与上面第一条同源 ✓。

function pickFn() { return () => 42; }
function returnFn(x) { return () => x; }
function pickNamed() { return plain; }
function plain() { return 7; }
function curry(a) { return (b) => (c) => a + b + c; }

const iifeValue = (function () {
  function helper(x) { return x * 2; }
  return helper(21);
})();

const arrowValue = (() => {
  function helper() { return 3; }
  return helper();
})();

const moduleObject = (function () {
  function a() { return b(); }
  function b() { return 7; }
  return { run: a };
})();

function destructured({ a, b: renamed }) { return a + renamed; }
function withDefault({ a = 1 } = {}) { return a; }
function ordered({ a }, b = a * 2) { return a + b; }
const arrowPattern = ([x, y]) => x - y;
class PatternClass { m({ a }) { return a; } }

console.log("expr-position", iifeValue, arrowValue, moduleObject.run());
console.log("call-of-call", pickFn()(), returnFn(6)(), pickNamed()(), curry(1)(2)(3));
console.log("call-of-call-arg", pickFn()() + 1, [pickFn()(), returnFn(2)()].join(","));
console.log("pattern-params", destructured({ a: 1, b: 2 }), withDefault(), withDefault({ a: 9 }),
  ordered({ a: 3 }), arrowPattern([5, 3]), new PatternClass().m({ a: 4 }));
console.log("pattern-captured", (() => {
  function outer({ a }) { return () => a + 1; }
  return outer({ a: 5 })();
})());
console.log("after", 1 + 1);
