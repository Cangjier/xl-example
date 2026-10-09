// xl:title 符号进字符串拼接 / 模板串 / 比较要抛（而且要是 `TypeError`）
// xl:round 692
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 3 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/007-symbol-concat-throws.ts
//   · stdlib/symbol/probe697-y19.ts
//   · stdlib/symbol/probe-y06.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/007-symbol-concat-throws.ts ——
(function () {
  try { console.log("x" + (Symbol("s") as any)); } catch (e: any) { console.log("threw", e.name); }
  try { console.log(`${Symbol("t") as any}`); } catch (e: any) { console.log("threw", e.name); }
})();

// —— 并入自 stdlib/symbol/probe697-y19.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { return Symbol() + ""; } catch (e) { return e.constructor.name; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe-y06.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { try { return Symbol() < Symbol(); } catch (e) { return e.constructor.name; } })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
