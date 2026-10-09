// xl:title `Symbol.toPrimitive` 的三种 hint（`default` / `number` / `string`）
// xl:round 291
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 4 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/002-symbol-toprimitive.ts
//   · stdlib/symbol/011-symbol-toprimitive-and-concat.ts
//   · stdlib/symbol/015-symbol-toprimitive-custom.ts
//   · stdlib/symbol/136-symbol-toprimitive.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/002-symbol-toprimitive.ts ——
(function () {
  const o: any = { [Symbol.toPrimitive](hint: string) { return hint === "number" ? 7 : "S"; } };
  console.log(o + 1, "" + o, o * 2);
})();

// —— 并入自 stdlib/symbol/011-symbol-toprimitive-and-concat.ts ——
(function () {
  const o = { [Symbol.toPrimitive](hint: string) { return hint === "number" ? 1 : hint === "string" ? "S" : "default"; } };
  console.log(o as any as number + 1, `${o}`, String(o));
  try { console.log("x" + (Symbol("s") as any)); } catch (e: any) { console.log(e.name); }
})();

// —— 并入自 stdlib/symbol/015-symbol-toprimitive-custom.ts ——
(function () {
  const o: any = {
    [Symbol.toPrimitive](hint: string) { return hint === "number" ? 42 : "str"; },
  };
  console.log(+o, o + "", String(o));
})();

// —— 并入自 stdlib/symbol/136-symbol-toprimitive.ts ——
(function () {
  const o: any = { [Symbol.toPrimitive](hint: string) { return "hint:" + hint; } };
  console.log(String(o));
  console.log(`${o}`);
  console.log(o + "");
  try { console.log(+o); } catch (e: any) { console.log("unary", e.constructor.name); }
})();
