// xl:title `typeof` 的取值表、`void` 与逗号表达式
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/197-typeof-typeof-1 · 206-typeof-null · 207-typeof-undefined · 208-typeof
//   · exec/expressions/209-void-0 · 210-typeof-function-prototype
//   · exec/expressions/p-op-void-comma
//   · exec/expressions/probe-o47
//   · exec/expressions/probe2-b04
//   · exec/expressions/probe704-x-b24 · b60 · probe694-m23 · m24 · m25（第二批）
// 判据只有一条：`typeof` 给出的名字（`null` 是 `"object"`、数组是 `"object"`、函数与箭头都是
// `"function"`），以及 `void` 的结果恒为 `undefined`、逗号表达式取最后一个。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => typeof typeof 1);
probe(() => typeof null);
probe(() => typeof undefined);
probe(() => typeof []);
probe(() => typeof function () {});
probe(() => typeof (() => {}));
probe(() => typeof (function () {}).prototype);
probe(() => typeof new Number(1));

probe(() => void 0);
probe(() => void 0 === undefined);

// `void` 与逗号：求值发生，但交出的是 `undefined` / 最后一个
let n = 0;
probe(() => void (n = 5));
probe(() => n);
probe(() => (1, 2, 3));

// 第 787 轮并进来的三条（`probe694-m23` / `m24` / `m25`）：调用结果与内建构造器的 `typeof`
probe(() => (function () { return typeof (function () {})(); })());
probe(() => (function () { return typeof Function.prototype; })());
probe(() => (function () { return typeof Object; })());
