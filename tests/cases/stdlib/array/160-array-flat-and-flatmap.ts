// xl:title `flat` / `flatMap`：深度参数、`Infinity` 与洞的落法
// xl:round 692
// xl:judge stdout
// xl:end
// **第 810 轮（合并）**：这一条是它那个判定点的**唯一**一条——早先它自称已经合并过这些文件，
//  而那些文件**一直还在盘上**（同判定点重复、分母被灌水）。这一轮把它们的正文**逐字**接在
//  下面（每块一个 IIFE、块首写明出处），**源文件从盘上删掉**；并组完整性由一把一次性尺子核对：
//  合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各被并条 stdout 的顺次相接」
//  **逐字节相同**（两侧都中）。
// **合并了原先同一个判定点的二十余条**：
//   probe-a04 · probe-a21 · probe693-a01 · probe693-a02 · probe693-a03 · probe693-a04 ·
//   probe694-a01 · probe694-a02 · probe694-a19 · probe703-a-b01 · probe703-a-b02 ·
//   probe703-a-b09 · probe703-a-b45 · probe704-a-f18 · probe696-r16（无关那一半）
//   ＋（第 810 轮下盘的 14 条，正文见下面各块）
//
// 判定点只有一个：**摊几层、洞怎么算**——
//  ① `flat()` 默认摊 **1 层**；`flat(0)` 一层都不摊；`flat(d)` 摊 d 层；`flat(Infinity)` 摊到底；
//  ② `flatMap` 永远只摊 **1 层**（等于 `map` + `flat()`）；
//  ③ 摊的时候**洞被去掉**（结果里没有洞）；
//  ④ 只认真数组（`Symbol.isConcatSpreadable` 不参与这一族）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const deep: any = [[1, [2, [3]]]];

try {
  console.log(show([1, [2, 3]].flat().length));
  console.log(show(deep.flat().join(",")));
  console.log(show(deep.flat(2).join(",")));
  console.log(show(deep.flat(Infinity).join(",")));
  console.log(show([1, 2, 3].flat(0).length));
  console.log(show([[1], [2]].flat().join(",")));
  console.log(show([1, 2].flatMap((x: any) => [x, x]).join(",")));
  console.log(show([1, 2].flatMap((x: any) => [x, x]).length));
  console.log(show([1, 2, 3].flatMap((x: any) => x).length));
  console.log(show([1, 2, 3].flatMap((x: any) => [x, x]).length));
  console.log(show([1, , 3].flat().length));
  console.log(show([1, , 3].flatMap((x: any) => [x]).length));
  console.log(show([1, , 3].flat().join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

//  ---- 并自 010-array-flatmap.ts ----
(() => {
console.log([1, 2].flatMap((v) => [v, v * 10]).join(","));
console.log(["a b", "c"].flatMap((s) => s.split(" ")).join("|"));
})();

//  ---- 并自 019-array-flat-depth.ts ----
(() => {
const xs: any[] = [1, [2, [3, [4]]]];
console.log(xs.flat().join(","), xs.flat(2).join(","), xs.flat(Infinity).join(","));
console.log(xs.flat(0).length, [].flat().length);
})();

//  ---- 并自 030-array-find-last-and-flatmap.ts ----
(() => {
const xs = [1, 2, 3, 4];
console.log(xs.findLast((v) => v % 2 === 1), xs.findLastIndex((v) => v % 2 === 1));
console.log(xs.findLast((v) => v > 9), xs.findLastIndex((v) => v > 9));
console.log([1, 2].flatMap((v) => [v, v * 10]).join(","));
console.log([1, 2].flatMap((v) => (v > 1 ? [v] : [])).join(","));
})();

//  ---- 并自 034-array-flat-deep-levels.ts ----
(() => {
const xs = [1, [2, [3, [4]]]];
console.log(xs.flat(2).join(","), xs.flat(Infinity).join(","), xs.flat(0).length);
})();

//  ---- 并自 038-array-flat-deep-and-infinity.ts ----
(() => {
console.log([1, [2, [3, [4]]]].flat(1).join(","));
console.log([1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
console.log([1, , 2].flat().length);
})();

//  ---- 并自 052-array-flat-and-flatmap-forms.ts ----
(() => {
console.log([1, [2, [3, [4]]]].flat().length, [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
console.log([1, 2].flatMap((x) => (x === 1 ? [] : [x, x])).join(","));
})();

//  ---- 并自 059-array-flatmap-and-depth.ts ----
(() => {
console.log([[1], [2, 3]].flatMap((x) => x).join(","), [[[1]], [[2]]].flatMap((x) => x).length);
})();

//  ---- 并自 075-array-flat-depth-forms.ts ----
(() => {
console.log(JSON.stringify([1, [2, [3, [4]]]].flat()));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(2)));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(Infinity)));
console.log(JSON.stringify([1, [2, [3]]].flat(0)));
console.log([1, 2].flatMap((v) => [v, v * 10]).join(","));
})();

//  ---- 并自 102-array-flat-depth-and-sparse.ts ----
(() => {
console.log([1, [2, [3, [4]]]].flat().join(","), [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","), [1, [2]].flat(0).join(","));
const holey: any[] = [1, , 3];
console.log(holey.flat().length, holey.flat().join(","), JSON.stringify(holey.flat()));
})();

//  ---- 并自 104-array-flat-depth-and-holes.ts ----
(() => {
const nested = [1, [2, [3, [4]]], , 5];
console.log(JSON.stringify(nested.flat()));
console.log(JSON.stringify(nested.flat(2)));
console.log(JSON.stringify(nested.flat(Infinity)));
console.log(JSON.stringify([1, 2, 3].flatMap((n) => (n === 2 ? [] : [n, n * 10]))));
console.log([1, , 3].flatMap((v) => [v]).length);
})();

//  ---- 并自 106-array-flat-flatmap.ts ----
(() => {
console.log([1, [2, [3, [4]]]].flat().length);
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(2)));
console.log(JSON.stringify([1, 2, 3].flatMap((x) => [x, x * 2])));
console.log(JSON.stringify([1, 2].flatMap((x) => [[x]])));
})();

//  ---- 并自 123-flat-depth.ts ----
(() => {
const a: any = [1, [2, [3, [4]]]];
console.log(JSON.stringify(a.flat()));
console.log(JSON.stringify(a.flat(2)));
console.log(JSON.stringify(a.flat(Infinity)));
})();

//  ---- 并自 124-flatmap-holes.ts ----
(() => {
const a: any = [1, , 3];
console.log(JSON.stringify(a.flatMap((x: any) => [x, x * 2])));
console.log(JSON.stringify(a.map((x: any) => x * 2)));
})();

//  ---- 并自 153-array-flat-symbol-isconcat.ts ----
(() => {
const nested: any = [1, [2, [3]]];
console.log(JSON.stringify(nested.flat(1)));
console.log(JSON.stringify(nested.flat(0)));
console.log(JSON.stringify([].flat()));
})();
