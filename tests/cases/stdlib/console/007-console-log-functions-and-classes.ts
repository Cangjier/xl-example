// xl:title `console.log` 打函数 / 类 / 方法：具名 / 匿名 / 箭头 / 对象方法 / 生成器与 `async`
// xl:round 305
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 10 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/console/014-console-log-function-name-from-property.ts
//   · stdlib/console/028-con-log-function.ts
//   · stdlib/console/030-con-log-async-function.ts
//   · stdlib/console/probe703-c-h13.ts
//   · stdlib/console/probe703-c-h14.ts
//   · stdlib/console/probe705-c-e01.ts
//   · stdlib/console/probe705-c-e02.ts
//   · stdlib/console/probe705-c-e03.ts
//   · stdlib/console/probe705-c-e04.ts
//   · stdlib/console/probe705-c-e19.ts
//
// 这个域的每一块都是**同步**的 console.log 渲染，所以块与块之间不需要
// 排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是各条 stdout 的
// **顺次相接**（第 799 轮用尺子逐字节核过：8 条合并条的 stdout 与
// 各条单独跑的 stdout 顺次相接**逐字节相同**）。

// —— 并入自 stdlib/console/014-console-log-function-name-from-property.ts ——
(function () {
  const f = () => 1;
  console.log({ f }, { m() {} }, [function named() {}]);
})();

// —— 并入自 stdlib/console/028-con-log-function.ts ——
(function () {
  function f(a: number, b?: string): void {}
  console.log(f);
  console.log(class {});
  console.log({ m: f });
})();

// —— 并入自 stdlib/console/030-con-log-async-function.ts ——
(function () {
  console.log(function* gen() {});
  console.log(async function g() {});
  console.log({ a: async () => 1 });
})();

// —— 并入自 stdlib/console/probe703-c-h13.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(function named() {});
})();

// —— 并入自 stdlib/console/probe703-c-h14.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(() => 1);
})();

// —— 并入自 stdlib/console/probe705-c-e01.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(class A { m() {} });
})();

// —— 并入自 stdlib/console/probe705-c-e02.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(function f() { return 1; });
})();

// —— 并入自 stdlib/console/probe705-c-e03.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log((a) => a);
})();

// —— 并入自 stdlib/console/probe705-c-e04.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log({ m() {} });
})();

// —— 并入自 stdlib/console/probe705-c-e19.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(class {});
})();
