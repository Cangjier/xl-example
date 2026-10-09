// xl:title `Symbol.toStringTag` 影响 `Object.prototype.toString`
// xl:round 305
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 2 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/004-symbol-tostringtag.ts
//   · stdlib/symbol/018-symbol-tostringtag-custom.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/004-symbol-tostringtag.ts ——
(function () {
  const o: any = { [Symbol.toStringTag]: "Custom" };
  console.log(Object.prototype.toString.call(o));
  console.log(Object.prototype.toString.call(new Map()));
})();

// —— 并入自 stdlib/symbol/018-symbol-tostringtag-custom.ts ——
(function () {
  class C { get [Symbol.toStringTag]() { return "Custom"; } }
  console.log(Object.prototype.toString.call(new C()), String(new C()));
})();
