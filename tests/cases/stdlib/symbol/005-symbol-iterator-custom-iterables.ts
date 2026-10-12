// xl:title 自定义 `Symbol.iterator` 的可迭代物：展开、`for..of`、手动 `next()`
// xl:round 291
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 7 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/001-symbol-iterator.ts
//   · stdlib/symbol/014-symbol-wellknown-custom-iterator.ts
//   · stdlib/symbol/017-symbol-iterator-manual.ts
//   · stdlib/symbol/019-array-iterator-symbol-method.ts
//   · stdlib/symbol/020-custom-iterable-symbol-iterator.ts
//   · stdlib/symbol/021-array-symbol-iterator-manual.ts
//   · stdlib/symbol/022-symbol-iterator-call-in-spread.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/001-symbol-iterator.ts ——
(function () {
  const o: any = {
    [Symbol.iterator]() {
      let i = 0;
      return { next: () => (i < 3 ? { value: i++, done: false } : { value: 0, done: true }) };
    },
  };
  console.log([...o].join(","), [..."ab"].join(","));
})();

// —— 并入自 stdlib/symbol/014-symbol-wellknown-custom-iterator.ts ——
(function () {
  const o: any = { [Symbol.iterator]: function* () { yield 1; yield 2; }, normal: 1 };
  console.log([...o].join(","), Object.keys(o).join(","));
  console.log(typeof Symbol.toPrimitive, typeof Symbol.toStringTag, typeof Symbol.asyncIterator);
})();

// —— 并入自 stdlib/symbol/017-symbol-iterator-manual.ts ——
(function () {
  const it = [10, 20][Symbol.iterator]();
  console.log(it.next().value, it.next().value, it.next().done);
  const s = "ab"[Symbol.iterator]();
  console.log(s.next().value, s.next().value, s.next().done);
})();

// —— 并入自 stdlib/symbol/019-array-iterator-symbol-method.ts ——
(function () {
  const xs = [1, 2];
  const it = (xs as any)[Symbol.iterator]();
  console.log(typeof (xs as any)[Symbol.iterator], JSON.stringify(it.next()), JSON.stringify(it.next()));
})();

// —— 并入自 stdlib/symbol/020-custom-iterable-symbol-iterator.ts ——
(function () {
  const range: any = {
    from: 1,
    to: 3,
    [Symbol.iterator]() {
      let i = this.from;
      const to = this.to;
      return { next: () => (i <= to ? { value: i++, done: false } : { value: undefined, done: true }) };
    },
  };
  console.log([...range].join(","));
  for (const v of range) console.log("v", v);
})();

// —— 并入自 stdlib/symbol/021-array-symbol-iterator-manual.ts ——
(function () {
  const it: any = [10, 20][Symbol.iterator]();
  console.log(it.next().value, it.next().value, it.next().done);
  const cursor: any = [1, 2, 3][Symbol.iterator]();
  console.log([...cursor].join(","));
  console.log(typeof [][Symbol.iterator]);
})();

// —— 并入自 stdlib/symbol/022-symbol-iterator-call-in-spread.ts ——
(function () {
  const a: any = [10, 20];
  console.log([...a[Symbol.iterator]()].join(","));
})();
