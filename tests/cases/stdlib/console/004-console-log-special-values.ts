// xl:title `console.log` 的原始值与符号：`undefined` / `null` / 布尔 / `Symbol` / `Date`
// xl:round 304
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 8 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/console/012-console-log-undefined-null.ts
//   · stdlib/console/probe703-c-h05.ts
//   · stdlib/console/probe703-c-h07.ts
//   · stdlib/console/probe703-c-h15.ts
//   · stdlib/console/probe703-c-h17.ts
//   · stdlib/console/probe703-c-h18.ts
//   · stdlib/console/probe705-c-e09.ts
//   · stdlib/console/probe705-c-e14.ts
//
// 这个域的每一块都是**同步**的 console.log 渲染，所以块与块之间不需要
// 排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是各条 stdout 的
// **顺次相接**（第 799 轮用尺子逐字节核过：8 条合并条的 stdout 与
// 各条单独跑的 stdout 顺次相接**逐字节相同**）。

// —— 并入自 stdlib/console/012-console-log-undefined-null.ts ——
(function () {
  console.log(undefined, null, "", true, false);
  console.log([undefined, null, ""], { a: undefined, b: null });
})();

// —— 并入自 stdlib/console/probe703-c-h05.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(Symbol("s"));
})();

// —— 并入自 stdlib/console/probe703-c-h07.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(undefined, null);
})();

// —— 并入自 stdlib/console/probe703-c-h15.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(new Date(0));
})();

// —— 并入自 stdlib/console/probe703-c-h17.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log({ a: undefined });
})();

// —— 并入自 stdlib/console/probe703-c-h18.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(String(Symbol("s")));
})();

// —— 并入自 stdlib/console/probe705-c-e09.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(Symbol("x"), typeof Symbol("x"));
})();

// —— 并入自 stdlib/console/probe705-c-e14.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(undefined, null, true, false);
})();
