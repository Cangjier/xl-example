// xl:title `console.log` 打 `Map` / `Set`（含对象键）
// xl:round 691
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 5 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/console/004-console-log-special.ts
//   · stdlib/console/025-con-log-map-set.ts
//   · stdlib/console/033-console-log-map.ts
//   · stdlib/console/probe703-c-h04.ts
//   · stdlib/console/probe705-c-e06.ts
//
// 这个域的每一块都是**同步**的 console.log 渲染，所以块与块之间不需要
// 排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是各条 stdout 的
// **顺次相接**（第 799 轮用尺子逐字节核过：8 条合并条的 stdout 与
// 各条单独跑的 stdout 顺次相接**逐字节相同**）。

// —— 并入自 stdlib/console/004-console-log-special.ts ——
(function () {
  console.log(new Map([["a", 1]]));
  console.log(new Set([1, 2]));
  console.log("Error: " + new Error("boom").message);
  console.log(Symbol("s"));
})();

// —— 并入自 stdlib/console/025-con-log-map-set.ts ——
(function () {
  console.log(new Map<any, any>([["a", 1]]));
  console.log(new Set<any>([1, 2]));
  console.log(new Map<any, any>([[{}, 1]]));
})();

// —— 并入自 stdlib/console/033-console-log-map.ts ——
(function () {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/console/probe703-c-h03.ts
  //   · stdlib/console/probe705-c-e05.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(new Map([[1, 2]]));
})();

// —— 并入自 stdlib/console/probe703-c-h04.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(new Set([1, 2]));
})();

// —— 并入自 stdlib/console/probe705-c-e06.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(new Set([1, "a"]));
})();
