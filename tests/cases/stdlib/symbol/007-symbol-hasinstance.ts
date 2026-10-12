// xl:title `Symbol.hasInstance` 自定义 `instanceof`（与 `Symbol.species` 的缺省语义）
// xl:round 371
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 3 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/003-symbol-hasinstance-root.ts
//   · stdlib/symbol/026-symbol-species-and-hasinstance.ts
//   · stdlib/symbol/028-symbol-hasinstance-r623.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/003-symbol-hasinstance-root.ts ——
(function () {
  class Even {
    static [Symbol.hasInstance](v: any) { return typeof v === "number" && v % 2 === 0; }
  }
  console.log(2 instanceof (Even as any), 3 instanceof (Even as any));
})();

// —— 并入自 stdlib/symbol/026-symbol-species-and-hasinstance.ts ——
(function () {
  class Even {
    static [Symbol.hasInstance](v: unknown) { return typeof v === "number" && (v as number) % 2 === 0; }
  }
  console.log(2 instanceof (Even as any), 3 instanceof (Even as any));
  class MyArray extends Array {}
  const out = new MyArray().concat([1]);
  console.log(out instanceof MyArray, out instanceof Array, (MyArray as any)[Symbol.species] === MyArray);
})();

// —— 并入自 stdlib/symbol/028-symbol-hasinstance-r623.ts ——
(function () {
  class Even {
    static [Symbol.hasInstance](x: any) { return typeof x === "number" && x % 2 === 0; }
  }
  console.log(2 instanceof Even, 3 instanceof Even);
})();
