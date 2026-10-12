// xl:title `console.log` 打的键序与不露面的成员：符号键 / 不可枚举 / 访问器 / 整数键在前
// xl:round 691
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 2 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/console/027-con-log-symbol-and-accessor.ts
//   · stdlib/console/probe703-c-h09.ts
//
// 这个域的每一块都是**同步**的 console.log 渲染，所以块与块之间不需要
// 排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是各条 stdout 的
// **顺次相接**（第 799 轮用尺子逐字节核过：8 条合并条的 stdout 与
// 各条单独跑的 stdout 顺次相接**逐字节相同**）。

// —— 并入自 stdlib/console/027-con-log-symbol-and-accessor.ts ——
(function () {
  const o: any = { a: 1 };
  o[Symbol("s")] = 2;
  Object.defineProperty(o, "h", { value: 3, enumerable: false });
  console.log(o);
  const g: any = {};
  Object.defineProperty(g, "x", { get() { return 1; }, enumerable: true });
  console.log(g);
})();

// —— 并入自 stdlib/console/probe703-c-h09.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log({ b: 1, a: 2 });
})();
