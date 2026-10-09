// xl:title arguments 的形状：长度、下标、与形参的别名
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe700-f-e19：松散模式里 `arguments` 与形参之间那条**双向别名**没有（本仓的 `arguments` 是降级层造的**数组**，与形参各占一格）：`arguments[0] = 9` 之后 `a` 还是 `1`（Node 给 `9`）。与 `e47`（`arguments.callee`）/ `t05`（`f.arguments`）同一条根——「`arguments` 是一个真的 `arguments` 对象」这件事还没做。要做。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/functions 里逐条一问的 13 条探针
// （probe-f14 · probe3-t11 · probe3-t12 · probe693b-f02 · probe693b-f03 · probe693b-f10 · probe693b-f30 · probe700-f-e18 · probe700-f-e19 · probe700-f-e48 · probe700-f-e50 · probe700-f-t05 · probe703-f-g25）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// length / 下标 / arguments 的来源（箭头继承外层）/ 松散模式与形参的双向别名（登记）

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe-f14.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return arguments.length; })(1, 2, 3)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-t11.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f() { return arguments.length; } return f(1, 2, 3); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe3-t12.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f(a) { return arguments[0]; } return f(7); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-f02.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f() { return arguments.length; } return f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-f03.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = function () { return arguments[1]; }; return f(1, 2); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-f10.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const f = () => arguments; return 1; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-f30.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function f() { return typeof arguments; } return f(); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e18.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function (a, b) { return arguments.length; })(1, 2, 3)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e19.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function (a) { arguments[0] = 9; return a; })(1)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e48.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function (...xs) { return xs.map(x => typeof x).join(); })(1, 'a')));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-e50.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return arguments.length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe700-f-t05.ts（第 700 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  function f() { return arguments[1]; }
  console.log(show(f(1, 2)) + "|" + show(typeof f.arguments));
})();

// 吸收 probe703-f-g25.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { return arguments.length; })(1, 2)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
