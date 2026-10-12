// xl:title `console.log` 的容器形态：数组 / 对象 / 嵌套 / 空 / 稀疏洞 / 折行
// xl:round 291
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 22 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/console/003-console-log-objects.ts
//   · stdlib/console/006-console-log-multi-and-nested.ts
//   · stdlib/console/007-console-log-container-shapes.ts
//   · stdlib/console/009-console-log-nested-empty.ts
//   · stdlib/console/011-console-log-nested-shapes.ts
//   · stdlib/console/013-console-log-nested-arrays.ts
//   · stdlib/console/015-console-shapes.ts
//   · stdlib/console/016-console-arrays-objects.ts
//   · stdlib/console/017-console-log-shapes.ts
//   · stdlib/console/019-console-render.ts
//   · stdlib/console/021-con-log-nested.ts
//   · stdlib/console/022-con-log-holes.ts
//   · stdlib/console/026-con-log-long.ts
//   · stdlib/console/probe703-c-h01.ts
//   · stdlib/console/probe703-c-h02.ts
//   · stdlib/console/probe703-c-h10.ts
//   · stdlib/console/probe703-c-h16.ts
//   · stdlib/console/probe705-c-e07.ts
//   · stdlib/console/probe705-c-e08.ts
//   · stdlib/console/probe705-c-e15.ts
//   · stdlib/console/probe705-c-e16.ts
//   · stdlib/console/probe705-c-e20.ts
//
// 这个域的每一块都是**同步**的 console.log 渲染，所以块与块之间不需要
// 排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是各条 stdout 的
// **顺次相接**（第 799 轮用尺子逐字节核过：8 条合并条的 stdout 与
// 各条单独跑的 stdout 顺次相接**逐字节相同**）。

// —— 并入自 stdlib/console/003-console-log-objects.ts ——
(function () {
  console.log({ a: 1, b: "x" });
  console.log([1, 2, 3], []);
  console.log({ nested: { deep: [1, { k: true }] } });
  console.log({});
})();

// —— 并入自 stdlib/console/006-console-log-multi-and-nested.ts ——
(function () {
  console.log("a", 1, true, null, undefined);
  console.log([1, [2, [3]]], { a: { b: [1, 2] } });
  console.log({ s: "x", n: 2, ok: false, nested: { deep: { deeper: 1 } } });
})();

// —— 并入自 stdlib/console/007-console-log-container-shapes.ts ——
(function () {
  console.log([1, [2, 3]], { a: { b: 1 } });
  console.log(new Map([["k", 1]]), new Set([1, 2]));
  console.log("a", 1, true, null, undefined, [1]);
  console.log([], {}, [], [{}]);
})();

// —— 并入自 stdlib/console/009-console-log-nested-empty.ts ——
(function () {
  console.log([]);
  console.log({});
  console.log([[]]);
  console.log({ a: {} });
  console.log([1, [2, [3]]]);
})();

// —— 并入自 stdlib/console/011-console-log-nested-shapes.ts ——
(function () {
  console.log({ a: [1, { b: 2 }], c: new Set([1]) });
  console.log([[1, 2], [3]]);
  console.log({ n: null, u: undefined, f: () => 1 });
})();

// —— 并入自 stdlib/console/013-console-log-nested-arrays.ts ——
(function () {
  console.log([1, [2, [3, [4]]]]);
  console.log([1, , 3]);
  console.log(new Array(3));
})();

// —— 并入自 stdlib/console/015-console-shapes.ts ——
(function () {
  console.log([1, 2], { a: 1 }, [[1], [2]]);
  console.log("s", 1, true, null, undefined);
  console.log({ f: () => 1 }.f.name, [1, 2, 3].join());
})();

// —— 并入自 stdlib/console/016-console-arrays-objects.ts ——
(function () {
  console.log([], {}, [[]], [{}]);
  console.log([1, "a", null, undefined, true]);
  console.log({ a: [], b: {}, c: [[]] });
  console.log([[1, 2], [3, 4]]);
})();

// —— 并入自 stdlib/console/017-console-log-shapes.ts ——
(function () {
  console.log("a", 1, true, null, undefined);
  console.log({ a: 1, b: { c: [1, 2] } });
  console.log([1, [2, [3]]]);
  console.log({ arr: [], obj: {}, fn: () => 0, sym: Symbol("s"), big: undefined });
  console.log("nested", { s: "x", n: NaN, i: Infinity, neg: -0 });
})();

// —— 并入自 stdlib/console/019-console-render.ts ——
(function () {
  console.log({ a: 1, b: [1, 2], c: { d: null } });
  console.log([1, [2, [3]]], [], {});
  console.log("s", 1, true, null, undefined, Symbol("y"));
  console.log(function named() {}, class Named {});
})();

// —— 并入自 stdlib/console/021-con-log-nested.ts ——
(function () {
  console.log({ a: 1, b: [1, 2], c: { d: { e: 3 } } });
  console.log([1, [2, [3]]]);
  console.log({});
  console.log([]);
})();

// —— 并入自 stdlib/console/022-con-log-holes.ts ——
(function () {
  const a: any = [1, , 3];
  console.log(a);
  console.log(new Array(3));
  console.log([undefined, null]);
})();

// —— 并入自 stdlib/console/026-con-log-long.ts ——
(function () {
  console.log({ aaaaaaaaaa: 1, bbbbbbbbbb: 2, cccccccccc: 3, dddddddddd: 4, eeeeeeeeee: 5 });
})();

// —— 并入自 stdlib/console/probe703-c-h01.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log([1, [2, [3, [4]]]]);
})();

// —— 并入自 stdlib/console/probe703-c-h02.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log({ a: { b: { c: 1 } } });
})();

// —— 并入自 stdlib/console/probe703-c-h10.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log([, 1]);
})();

// —— 并入自 stdlib/console/probe703-c-h16.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(["a", "b"]);
})();

// —— 并入自 stdlib/console/probe705-c-e07.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log([1, [2, [3, [4, [5]]]]]);
})();

// —— 并入自 stdlib/console/probe705-c-e08.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log({ a: { b: { c: { d: 1 } } } });
})();

// —— 并入自 stdlib/console/probe705-c-e15.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log({ 1: "a", b: "c" });
})();

// —— 并入自 stdlib/console/probe705-c-e16.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log([[1], [2]]);
})();

// —— 并入自 stdlib/console/probe705-c-e20.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(Object.assign({}, { a: 1 }));
})();
