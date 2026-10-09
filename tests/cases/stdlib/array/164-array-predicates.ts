// xl:title `find` / `findIndex` / `findLast` / `every` / `some`：谓词族的命中与短路
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-a05 · probe-a15 · probe-a22 · probe-a23 · probe-a24 · probe693-a07 · probe693-a08 ·
//   probe693-a39 · probe693-a40 · probe694-a11 · probe694-a12 · probe694-a23 · probe694-a24 ·
//   probe703-a-b04 · probe703-a-b05 · probe703-a-b33 · probe703-a-b34 · probe703-a-b35 ·
//   probe704-a-f10 · probe703-a-b36（无关那一半）· p-arr-findlast
//   ＋ `004-array-find-family` / `014-array-every-some` / `017-array-findlast`
//     / `041-array-every-some-shortcircuit` / `047-array-findindex-forms` / `054-array-every-some-empty-r305`
//     / `061-array-reduce-right-and-findindex` / `076-array-every-some-empty-r371`
//     / `109-array-every-some-reduce-edge` / `126-findlast-findlastindex`
//
// 判定点只有一个：**谓词族的答案与短路**——
//  ① `find` / `findIndex` 从左、`findLast` / `findLastIndex` 从右；没找到给 `undefined` / `-1`；
//  ② `every` 空数组给**真**、`some` 空数组给**假**（真空真、空假假）；
//  ③ 短路：`every` 一遇假停、`some` 一遇真停（回调次数是判据）；
//  ④ `filter` 交出新数组（长度可能为 0）。
//   `004-array-find-family` · `014-array-every-some` · `017-array-findlast` · `041-array-every-some-shortcircuit` · `047-array-findindex-forms` · `054-array-every-some-empty-r305` · `061-array-reduce-right-and-findindex` · `076-array-every-some-empty-r371` · `109-array-every-some-reduce-edge` · `126-findlast-findlastindex`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `004-array-find-family` · `014-array-every-some` · `017-array-findlast` · `041-array-every-some-shortcircuit` · `047-array-findindex-forms` · `054-array-every-some-empty-r305` · `061-array-reduce-right-and-findindex` · `076-array-every-some-empty-r371` · `109-array-every-some-reduce-edge` · `126-findlast-findlastindex`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([1, 2, 3].find((x: any) => x > 5)));
  console.log(show([1, 2, 3].find((x: any) => x > 1)));
  console.log(show([1, 2, 3].findIndex((x: any) => x > 1)));
  console.log(show([1, 2, 3, 4].findLast((x: any) => x % 2 === 1)));
  console.log(show([1, 2, 3, 4].findLastIndex((x: any) => x % 2 === 1)));
  console.log(show([1, 2, 3].findLast((x: any) => x > 1)));
  console.log(show([1, 2, 3].findLastIndex((x: any) => x < 3)));
  console.log(show([].every((x: any) => false)));
  console.log(show([].some((x: any) => true)));
  console.log(show([1, 2, 3].every((x: any) => x > 0) + "," + [1, 2, 3].some((x: any) => x > 2)));
  console.log(show([1, 2, 3].every((x: any) => x > 0)));
  console.log(show([1, 2, 3].some((x: any) => x > 2)));
  console.log(show([1, 2, 3].some((x: any) => x > 5)));
  console.log(show([1, 2, 3].filter((x: any) => x > 1).length));
  console.log(show([1, 2, 3].filter(Boolean).length));
  let everyN = 0;
  [1, 0, 3].every((x: any) => { everyN++; return x > 0; });
  let someN = 0;
  [0, 2, 3].some((x: any) => { someN++; return x > 0; });
  console.log(show(everyN + ":" + someN));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 004-array-find-family.ts ----
(function () {
const xs = [1, 2, 3, 4];
console.log(xs.find((v) => v > 2), xs.find((v) => v > 9));
console.log(xs.findIndex((v) => v > 2), xs.findIndex((v) => v > 9));
console.log(xs.some((v) => v > 3), xs.every((v) => v > 0), [].every((v: any) => false));
})();
//  ---- 并自 014-array-every-some.ts ----
(function () {
const xs = [2, 4, 6];
console.log(xs.every((v) => v % 2 === 0), xs.some((v) => v > 5), xs.some((v) => v > 99));
console.log([].every(() => false), [].some(() => true));
let calls = 0;
[1, 2, 3].every((v) => { calls++; return v < 2; });
console.log("calls", calls);
})();
//  ---- 并自 017-array-findlast.ts ----
(function () {
const xs = [1, 2, 3, 4, 5];
console.log(xs.findLast((v) => v % 2 === 1), xs.findLastIndex((v) => v % 2 === 1));
console.log(xs.findLast((v) => v > 99), xs.findLastIndex((v) => v > 99));
})();
//  ---- 并自 041-array-every-some-shortcircuit.ts ----
(function () {
let n = 0;
const xs = [1, 2, 3];
console.log(xs.every((v) => { n++; return v < 3; }), n);
n = 0;
console.log(xs.some((v) => { n++; return v > 1; }), n);
})();
//  ---- 并自 047-array-findindex-forms.ts ----
(function () {
const xs = [5, 12, 8, 130, 44];
console.log(xs.findIndex((n) => n > 10), xs.findLastIndex((n) => n > 10));
console.log(xs.findIndex((n) => n > 1000), xs.findLast((n) => n > 10));
})();
//  ---- 并自 054-array-every-some-empty-r305.ts ----
(function () {
console.log([].every(() => false), [].some(() => true), [].reduce((a, b) => a + b, 5));
})();
//  ---- 并自 061-array-reduce-right-and-findindex.ts ----
(function () {
console.log([1, 2, 3].reduceRight((a, b) => a + "" + b), [1, 2, 3].findIndex((n) => n > 1), [1, 2, 3].findLastIndex((n) => n < 3));
})();
//  ---- 并自 076-array-every-some-empty-r371.ts ----
(function () {
console.log(([] as number[]).every((v) => v > 0), ([] as number[]).some((v) => v > 0));
console.log([1, 2].every(Boolean), [0, 1].some(Boolean));
console.log(JSON.stringify([1, , 3].filter((v: number) => v > 1)));
console.log([1, , 3].find((v: number) => v === undefined), [1, , 3].findIndex((v: number) => v === undefined));
})();
//  ---- 并自 109-array-every-some-reduce-edge.ts ----
(function () {
console.log([].every(() => false), [].some(() => true));
console.log([1, 2, 3].every((x) => x > 0), [1, 2, 3].some((x) => x > 2));
try { [].reduce((a: number, b: number) => a + b); } catch (e) { console.log((e as Error).name); }
console.log([1, 2, 3].reduce((a, b) => a + b, 10));
console.log([1, 2, 3].reduceRight((a, b) => a + "" + b));
})();
//  ---- 并自 126-findlast-findlastindex.ts ----
(function () {
const a: any = [5, 12, 8, 130, 44];
console.log(a.findLast((x: any) => x > 10));
console.log(a.findLastIndex((x: any) => x > 10));
console.log(a.findLast((x: any) => x > 200));
})();
