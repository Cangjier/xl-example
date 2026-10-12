// xl:title `reduce` / `reduceRight`：初值的有无与空数组那一档
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-a14 · probe693-a35 · probe693-a36 · probe693-a37 · probe693-a38 · probe703-a-b13 ·
//   probe703-a-b36 · probe696-r32（无关那一半）· p-arr-reduce-empty · p-arr-reduceright
//   ＋ `005-array-reduce` / `015-array-reduceright` / `029-array-reduce-forms-and-empty`
//     / `033-array-reduce-empty-throws` / `039-array-reduce-with-and-without-initial`
//     / `050-array-reduce-forms` / `073-array-reduce-empty-forms` / `097-array-reduce-side-effects`
//     / `101-array-reduce-empty-family` / `134-reduce-empty` / `147-reduceright-and-entries`
//
// 判定点只有一个：**初值那一位决定一切**——
//  ① 给了初值：从第一个元素开始累积，空数组**给初值**（不抛）；
//  ② 不给初值：拿**第一个存在的元素**当初值；空数组（或只有洞）抛 `TypeError`；
//  ③ `reduceRight` 只是方向反过来（回调的实参顺序仍是 `(acc, value, index, array)`）；
//  ④ 回调族**跳过洞**（不给初值时，洞也算「不存在」）。
//   `005-array-reduce` · `015-array-reduceright` · `029-array-reduce-forms-and-empty` · `033-array-reduce-empty-throws` · `039-array-reduce-with-and-without-initial` · `050-array-reduce-forms` · `073-array-reduce-empty-forms` · `097-array-reduce-side-effects` · `101-array-reduce-empty-family` · `134-reduce-empty` · `147-reduceright-and-entries`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `005-array-reduce` · `015-array-reduceright` · `029-array-reduce-forms-and-empty` · `033-array-reduce-empty-throws` · `039-array-reduce-with-and-without-initial` · `050-array-reduce-forms` · `073-array-reduce-empty-forms` · `097-array-reduce-side-effects` · `101-array-reduce-empty-family` · `134-reduce-empty` · `147-reduceright-and-entries`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  console.log(show([1, 2, 3].reduce((a: any, b: any) => a + b, 10)));
  console.log(show([1, 2, 3].reduce((a: any, b: any) => a + b)));
  console.log(show([].reduce((a: any, b: any) => a + b, 10)));
  console.log(show(err(() => [].reduce((a: any, b: any) => a + b))));
  console.log(show([1, 2, 3].reduceRight((a: any, b: any) => a + "-" + b)));
  console.log(show([1, 2, 3].reduceRight((a: any, b: any) => a - b)));
  console.log(show([1, , 3].reduce((a: any, b: any) => a + b)));
  console.log(show([1, , 3].reduce((a: any, b: any) => a + b, 0)));
  console.log(show([, ,].reduce((a: any, b: any) => a + b, 0)));
  // 回调的实参表：`(acc, value, index, array)`
  const argsSeen: any[] = [];
  [10, 20].reduce((a: any, v: any, i: any, arr: any) => { argsSeen.push([a, v, i, arr === undefined ? "?" : arr.length].join(":")); return a + v; });
  console.log(show(argsSeen.join("|")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 005-array-reduce.ts ----
(function () {
const xs = [1, 2, 3, 4];
console.log(xs.reduce((a, b) => a + b, 0), xs.reduce((a, b) => a + b));
console.log(["a", "b"].reduce((a, b) => a + b, ""));
try { [].reduce((a: any, b: any) => a + b); } catch (e: any) { console.log("empty:", e.name); }
})();
//  ---- 并自 015-array-reduceright.ts ----
(function () {
const xs = ["a", "b", "c"];
console.log(xs.reduceRight((acc, v) => acc + v, ""));
console.log([1, 2, 3].reduceRight((a, b) => a - b), [1, 2, 3].reduceRight((a, b) => a - b, 10));
})();
//  ---- 并自 029-array-reduce-forms-and-empty.ts ----
(function () {
console.log([1, 2, 3].reduce((a, b) => a + b), [1, 2, 3].reduce((a, b) => a + b, 10));
console.log(["a", "b", "c"].reduceRight((a, b) => a + b));
console.log([1].reduce((a, b) => a + b), [1].reduce((a, b) => a + b, 100));
try { [].reduce((a: any, b: any) => a + b); } catch (e: any) { console.log(e.name); }
})();
//  ---- 并自 033-array-reduce-empty-throws.ts ----
(function () {
try {
  [].reduce((a: number, b: number) => a + b);
} catch (e) {
  console.log((e as Error).name);
}
console.log([].reduce((a: number, b: number) => a + b, 10));
})();
//  ---- 并自 039-array-reduce-with-and-without-initial.ts ----
(function () {
console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([].reduce((a, b) => a + b, "seed"));
console.log([1, 2].reduceRight((a, b) => a + "-" + b));
})();
//  ---- 并自 050-array-reduce-forms.ts ----
(function () {
console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([].reduce((a, b) => a + b, 0));
const words = ["a", "b"];
console.log(words.reduce((acc, w, i) => acc + i + w, ""));
})();
//  ---- 并自 073-array-reduce-empty-forms.ts ----
(function () {
console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([1, 2, 3].reduceRight((a, b) => a - b));
try { ([] as number[]).reduce((a, b) => a + b); } catch (e) { console.log((e as Error).name); }
console.log(([] as number[]).reduce((a, b) => a + b, 5));
console.log([1, , 3].reduce((a: number, b: number) => a + b, 0));
})();
//  ---- 并自 097-array-reduce-side-effects.ts ----
(function () {
console.log([1, 2, 3].reduce((a, b) => a + b));
console.log([].reduce((a, b) => a + b, 10));
try { [].reduce((a: any, b: any) => a + b); } catch (e) { console.log((e as Error).constructor.name); }
const holes = [1, , 3];
console.log(holes.reduce((a, b) => a + b, 0), holes.filter(() => true).length);
console.log([1, 2].reduce((a, b, i) => a + b + i, 0));
})();
//  ---- 并自 101-array-reduce-empty-family.ts ----
(function () {
console.log([1, 2, 3].reduce((a, b) => a + b), [1, 2, 3].reduce((a, b) => a + b, 10));
console.log([].reduce((a: number, b: number) => a + b, 0));
try { [].reduce((a: number, b: number) => a + b); } catch (e) { console.log("no-init:" + (e as Error).name); }
try { [].reduceRight((a: number, b: number) => a + b); } catch (e) { console.log("right:" + (e as Error).name); }
console.log(["a", "b"].reduceRight((a, b) => a + b));
})();
//  ---- 并自 134-reduce-empty.ts ----
(function () {
try { ([] as any).reduce((a: any, b: any) => a + b); } catch (e: any) { console.log("empty", e.constructor.name); }
console.log(([] as any).reduce((a: any, b: any) => a + b, 10));
})();
//  ---- 并自 147-reduceright-and-entries.ts ----
(function () {
console.log(["a", "b", "c"].reduceRight((acc: any, v: any) => acc + v, ""));
console.log(JSON.stringify([...["a", "b"].entries()]));
console.log(JSON.stringify([...["a", "b"].keys()]));
console.log(JSON.stringify([...["a", "b"].values()]));
})();
