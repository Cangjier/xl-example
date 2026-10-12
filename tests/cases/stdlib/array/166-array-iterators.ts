// xl:title 数组迭代器：`values` / `keys` / `entries` 与 `Symbol.iterator` 是同一件东西
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十二条**：
//   probe-a16 · probe-a17 · probe-a18 · probe-a33 · probe703-a-b25 · probe703-a-b26 ·
//   probe703-a-b27 · probe703-a-b49 · probe696-r18 · probe696-r19 · probe696-r20
//   ＋ `022-array-iterator-manual` / `035-array-iterator-protocol-manual` / `051-array-iterator-manual-forms`
//     / `067-array-iterator-next-and-spread` / `077-array-iterator-aliases` / `089-array-iterator`
//
// 判定点只有一个：**三个迭代器各自的步进值，以及 `next()` 的三段返回形状**——
//  ① `values()`（＝`Symbol.iterator`）一步一步给**元素**；
//  ② `keys()` 给**下标**；`entries()` 给 `[下标, 元素]`；
//  ③ 每步是 `{ value, done }`（走完那一档 `done` 真、`value` 是 `undefined`）；
//  ④ 展开 / `for...of` / 解构都吃这一条协议。
//   `022-array-iterator-manual` · `035-array-iterator-protocol-manual` · `051-array-iterator-manual-forms` · `067-array-iterator-next-and-spread` · `077-array-iterator-aliases` · `089-array-iterator`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `022-array-iterator-manual` · `035-array-iterator-protocol-manual` · `051-array-iterator-manual-forms` · `067-array-iterator-next-and-spread` · `077-array-iterator-aliases` · `089-array-iterator`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([1, 2, 3].keys().next().value));
  console.log(show([1, 2, 3].values().next().value));
  console.log(show([1, 2, 3][Symbol.iterator]().next().value));
  console.log(show([1, 2, 3].entries().next().value.join(",")));
  const it: any = [1, 2].values();
  console.log(show(JSON.stringify(it.next())));
  console.log(show(JSON.stringify(it.next())));
  console.log(show(JSON.stringify(it.next())));
  console.log(show([...(function* () { yield 1; yield 2; })()].join(",")));
  const a: any = [1, 2];
  const [x, y] = a;
  console.log(show(x + "," + y));
  console.log(show([..."ab"].join(",")));
  console.log(show([...Array(3).keys()].join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 022-array-iterator-manual.ts ----
(function () {
const it = [10, 20].values();
console.log(it.next().value, it.next().value, it.next().done);
const ks = [10, 20].keys();
console.log(ks.next().value, ks.next().value, ks.next().done);
console.log([...["a", "b"].entries()].map((p) => p.join(":")).join(","));
})();
//  ---- 并自 035-array-iterator-protocol-manual.ts ----
(function () {
const xs = [10, 20];
const it = xs[Symbol.iterator]();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
})();
//  ---- 并自 051-array-iterator-manual-forms.ts ----
(function () {
const k = ["a", "b"].keys();
const v = ["a", "b"].values();
const e = ["a", "b"].entries();
console.log(k.next().value, v.next().value, JSON.stringify(e.next().value));
console.log(JSON.stringify([...["x", "y"].entries()]));
})();
//  ---- 并自 067-array-iterator-next-and-spread.ts ----
(function () {
const xs = [10, 20, 30];
const it = xs.values();
console.log(it.next().value, it.next().value, it.next().value, it.next().done);
console.log([...xs.keys()].join(","), [...xs.entries()].map((p) => p.join(":")).join(" "));
console.log(Array.from(xs.values()).length);
})();
//  ---- 并自 077-array-iterator-aliases.ts ----
(function () {
const xs = ["a", "b"];
console.log([...xs.values()].join(""), [...xs.keys()].join(""), [...xs.entries()].map((e) => e.join(":")).join(" "));
console.log(xs[Symbol.iterator] === xs.values);
const it = xs[Symbol.iterator]();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
})();
//  ---- 并自 089-array-iterator.ts ----
(function () {
const [a, b] = [1, 2, 3];
console.log(a, b);
const it = [10, 20][Symbol.iterator]();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
console.log([... [1, 2].entries()].map((e) => e.join(":")).join(","));
})();
