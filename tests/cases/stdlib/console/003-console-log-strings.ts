// xl:title `console.log` 的字符串口径：引号 / 换行 / 空串 / 拼接结果（顶层不加引号、嵌套加单引号）
// xl:round 691
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 7 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/console/005-console-log-strings.ts
//   · stdlib/console/008-console-log-string-forms.ts
//   · stdlib/console/024-con-log-strings.ts
//   · stdlib/console/probe703-c-h11.ts
//   · stdlib/console/probe705-c-e10.ts
//   · stdlib/console/probe705-c-e11.ts
//   · stdlib/console/probe705-c-e17.ts
//
// 这个域的每一块都是**同步**的 console.log 渲染，所以块与块之间不需要
// 排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是各条 stdout 的
// **顺次相接**（第 799 轮用尺子逐字节核过：8 条合并条的 stdout 与
// 各条单独跑的 stdout 顺次相接**逐字节相同**）。

// —— 并入自 stdlib/console/005-console-log-strings.ts ——
(function () {
  console.log("plain");
  console.log("with \"quotes\"");
  console.log("");
  console.log("multi\nline");
})();

// —— 并入自 stdlib/console/008-console-log-string-forms.ts ——
(function () {
  console.log("plain", "with space", "with'quote", 'with"double');
  console.log("a\nb", "tab\there");
  console.log(1, -1, 0, -0, 1.5, 1e21, 1e-7, NaN, Infinity);
})();

// —— 并入自 stdlib/console/024-con-log-strings.ts ——
(function () {
  console.log("a'b");
  console.log({ s: "a'b" });
  console.log({ s: "a\nb" });
  console.log("a\nb");
})();

// —— 并入自 stdlib/console/probe703-c-h11.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log("a\nb");
})();

// —— 并入自 stdlib/console/probe705-c-e10.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log("a".repeat(3));
})();

// —— 并入自 stdlib/console/probe705-c-e11.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log([1, 2].join("-"), [].join("-"));
})();

// —— 并入自 stdlib/console/probe705-c-e17.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log("quote\"s", 'sq');
})();
