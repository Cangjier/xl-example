// xl:title 回调族对**洞**的口径：跳过、算 `undefined`，还是两个都算
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe693-a16 · probe693-a17 · probe693-a55 · probe696-h04 · probe696-h05 ·
//   probe696-h06 · probe696-h07 · probe696-h08 · probe696-h09 · probe696-h10 ·
//   probe696-h11 · probe696-h22 · probe696-r47 · probe696-r49 · p-arr-map-keeps-hole
//   ＋ `013-array-sparse-iteration` / `082-array-holes-per-method` / `090-array-holes`
//     / `120-array-callbacks-holes` / `148-array-holes-foreach-map` / `119-sort-edges`（无关那一半）
//
// 判定点只有一个：**洞在「回调族」与「取值族」里是两回事**——
//  ① 回调族（`map` / `forEach` / `filter` / `some` / `every` / `reduce`）**跳过洞**（回调不跑）；
//  ② 但 `map` / `filter` 的结果里**洞还在**（`map` 不补格）；
//  ③ 取值族（`join` / `includes` / 展开 / `Array.from`）把洞当 `undefined`（给空串 / 给真 / 补格）；
//  ④ `Object.keys` / `Object.entries` 不算洞那一格。
//   `013-array-sparse-iteration` · `082-array-holes-per-method` · `090-array-holes` · `120-array-callbacks-holes` · `148-array-holes-foreach-map`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `013-array-sparse-iteration` · `082-array-holes-per-method` · `090-array-holes` · `120-array-callbacks-holes` · `148-array-holes-foreach-map`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const holes: any = [, 1];

try {
  console.log(show(holes.map((v: any) => String(v)).join("|")));
  console.log(show(holes.map((v: any) => String(v)).length));
  console.log(show([, ,].map((x: any) => x).join("|")));
  console.log(show([1, , 3].map((x: any) => x * 2).length));
  console.log(show(holes.filter(() => true).length));
  console.log(show(holes.filter((v: any) => true).length));
  let n = 0;
  holes.forEach(() => { n++; });
  console.log(show(n));
  console.log(show([1, , 3].reduce((a: any, b: any) => a + b)));
  console.log(show([1, , 3].reduce((a: any, b: any) => a + b, 0)));
  console.log(show(holes.length));
  console.log(show(0 in holes));
  console.log(show([...(holes as any[])].length));
  console.log(show(([...(holes as any[])] as any[])[0]));
  console.log(show(Object.keys(holes).join(",")));
  console.log(show(Object.entries(holes).length));
  console.log(show(holes.includes(undefined)));
  console.log(show(holes.join("-")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 013-array-sparse-iteration.ts ----
(function () {
const xs: any[] = [1, , 3];
let count = 0;
xs.forEach(() => { count++; });
console.log(count, xs.map((v) => v).length, xs.join("-"));
})();
//  ---- 并自 082-array-holes-per-method.ts ----
(function () {
const holes: any[] = [1, , 3];
console.log("A find", holes.find((v) => v === undefined), "findIndex", holes.findIndex((v) => v === undefined));
console.log("B findLast", holes.findLast((v) => v === undefined), "findLastIndex", holes.findLastIndex((v) => v === undefined));
console.log("C some", holes.some((v) => v === undefined), "every", holes.every((v) => v !== undefined));
let calls = 0;
holes.forEach(() => { calls += 1; });
console.log("D forEach calls", calls);
console.log("E indexOf", holes.indexOf(undefined), "lastIndexOf", holes.lastIndexOf(undefined), "includes", holes.includes(undefined));
console.log("F join", holes.join("-"), "length", holes.length, "in", 1 in holes);
})();
//  ---- 并自 090-array-holes.ts ----
(function () {
const a = [1, , 3];
console.log(a.length, a.join(","), a.map((x) => x).length, a.filter(() => true).length);
let seen = 0;
a.forEach(() => seen++);
console.log(seen, JSON.stringify(a), Object.keys(a).join(","));
})();
//  ---- 并自 120-array-callbacks-holes.ts ----
(function () {
const sparse: any = [1, , 3];
try { console.log("map-keeps-hole", String(sparse.map((x: any) => x * 2).length + ':' + String(sparse.map((x: any) => x * 2)[1]))); } catch (e) { console.log("map-keeps-hole", "ERR", String(e && e.name)); }
try { console.log("foreach-count", String((() => { let n = 0; sparse.forEach(() => { n++; }); return n; })())); } catch (e) { console.log("foreach-count", "ERR", String(e && e.name)); }
try { console.log("filter", String(sparse.filter(() => true).length)); } catch (e) { console.log("filter", "ERR", String(e && e.name)); }
try { console.log("every", String(String(sparse.every((x: any) => x > 0)))); } catch (e) { console.log("every", "ERR", String(e && e.name)); }
try { console.log("reduce-skips", String(sparse.reduce((a: any, b: any) => a + b, 0))); } catch (e) { console.log("reduce-skips", "ERR", String(e && e.name)); }
try { console.log("keys-of-holes", String(Object.keys(sparse).join(','))); } catch (e) { console.log("keys-of-holes", "ERR", String(e && e.name)); }
})();
//  ---- 并自 148-array-holes-foreach-map.ts ----
(function () {
const a: any = [1, , 3];
const seen: any[] = [];
a.forEach((v: any, i: any) => seen.push(i + ":" + v));
console.log(seen.join(","));
console.log(JSON.stringify(a.filter(() => true)));
console.log(a.some((v: any) => v === undefined), a.every((v: any) => v !== undefined));
console.log(JSON.stringify(a.fill(0, 1, 2)));
})();
