// xl:title `console.log` 的数字口径：整数 / 浮点 / `-0` / `NaN` / `Infinity` / 指数 / 极值
// xl:round 371
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 8 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/console/002-console-log-numbers-root.ts
//   · stdlib/console/018-console-log-numbers-r371.ts
//   · stdlib/console/023-con-log-special-numbers.ts
//   · stdlib/console/probe703-c-h08.ts
//   · stdlib/console/probe703-c-h19.ts
//   · stdlib/console/probe703-c-h20.ts
//   · stdlib/console/probe705-c-e12.ts
//   · stdlib/console/probe705-c-e13.ts
//
// 这个域的每一块都是**同步**的 console.log 渲染，所以块与块之间不需要
// 排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是各条 stdout 的
// **顺次相接**（第 799 轮用尺子逐字节核过：8 条合并条的 stdout 与
// 各条单独跑的 stdout 顺次相接**逐字节相同**）。

// —— 并入自 stdlib/console/002-console-log-numbers-root.ts ——
(function () {
  console.log(1, 1.5, -0, 0 / 0, 1 / 0, -1 / 0);
  console.log(0.1 + 0.2, 1e21, 1e-7);
})();

// —— 并入自 stdlib/console/018-console-log-numbers-r371.ts ——
(function () {
  console.log(1, 1.5, -0, 1 / 3, 1e21, 1e-7, NaN, Infinity, -Infinity);
  console.log(0.1 + 0.2, 2 ** 53, -(2 ** 53));
  console.log(Number.MAX_VALUE, Number.MIN_VALUE);
  console.log(255, -255, 0.000001, 1000000000000000000000);
})();

// —— 并入自 stdlib/console/023-con-log-special-numbers.ts ——
(function () {
  console.log(-0, 0, Infinity, -Infinity, NaN);
  console.log([-0, NaN]);
  console.log({ n: -0 });
})();

// —— 并入自 stdlib/console/probe703-c-h08.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(-0);
})();

// —— 并入自 stdlib/console/probe703-c-h19.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(0.1 + 0.2);
})();

// —— 并入自 stdlib/console/probe703-c-h20.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log([1, 2].length, {}.constructor === Object);
})();

// —— 并入自 stdlib/console/probe705-c-e12.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(1e21, 1e-7, -0);
})();

// —— 并入自 stdlib/console/probe705-c-e13.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(NaN, Infinity, -Infinity);
})();
