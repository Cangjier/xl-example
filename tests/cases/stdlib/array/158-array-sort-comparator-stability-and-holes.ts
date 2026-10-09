// xl:title `sort`：默认字典序、比较器、稳定性与 `undefined` / 洞的落位
// xl:round 692
// xl:judge stdout
// xl:end
// **第 810 轮（合并）**：这一条是它那个判定点的**唯一**一条——早先它自称已经合并过这些文件，
//  而那些文件**一直还在盘上**（同判定点重复、分母被灌水）。这一轮把它们的正文**逐字**接在
//  下面（每块一个 IIFE、块首写明出处），**源文件从盘上删掉**；并组完整性由一把一次性尺子核对：
//  合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各被并条 stdout 的顺次相接」
//  **逐字节相同**（两侧都中）。
// **合并了原先同一个判定点的三十余条**：
//   probe-a09 · probe-a29 · probe693-a31 · probe693-a32 · probe693-a33 · probe693-a34 ·
//   probe696-r50 · probe698-a01 · probe698-a02 · probe698-a03 · probe698-a04 ·
//   probe698-a05 · probe698-a06 · probe698-a08 · probe698-a09 · probe698-a10 ·
//   probe703-a-b31 · probe703-a-b32 · p-arr-sort-default
//   ＋（第 810 轮下盘的那 20 条，正文见下面各块）
//
// 判定点只有一个：**`sort` 的比较口径与落位**——
//  ① 不给比较器：元素转字符串按**码元**序（`10 < 9`）；
//  ② 给了比较器：只看返回值的**符号**（小数、`NaN` 一律当 0）；
//  ③ 稳定：比出来相等时保持原序；
//  ④ `undefined` 与**洞**一律排到最后（洞再往后），且不调比较器；
//  ⑤ 返回**原数组**（身份不变，原地排）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([3, 1, 2].sort().join(",")));
  console.log(show([10, 1, 3].sort().join(",")));
  console.log(show([10, 9, 1].sort().join(",")));
  console.log(show(["b", "a", "C"].sort().join(",")));
  console.log(show([3, 1, 2].sort((a: any, b: any) => b - a).join(",")));
  console.log(show([10, 9, 1].sort((x: any, y: any) => x - y).join(",")));
  console.log(show([3, 1, 2].sort(() => 0).join(",")));
  console.log(show([3, 1, 2].sort(() => NaN).join(",")));
  console.log(show([3, undefined, 1].sort().join(",")));
  console.log(show([undefined, 1, 2].sort().join(",")));
  console.log(show([1, undefined, 2].sort().length));
  console.log(show([1, , 3].sort().join(",")));
  console.log(show([1, 2, 3].sort((x: any, y: any) => String(x) < String(y) ? -1 : 1).join(",")));
  const same: any = [1, 2, 3];
  console.log(show(same.sort((a: any, b: any) => a - b) === same));
  const stable: any = [{ k: 1, i: 0 }, { k: 1, i: 1 }, { k: 0, i: 2 }];
  stable.sort((a: any, b: any) => a.k - b.k);
  console.log(show(stable.map((x: any) => x.i).join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

//  ---- 并自 006-array-sort-root.ts ----
(() => {
const xs = [10, 9, 1, 2];
console.log(xs.slice().sort().join(","));
console.log(xs.slice().sort((a, b) => a - b).join(","));
console.log(xs.slice().sort((a, b) => b - a).join(","));
const words = ["pear", "apple", "fig"];
console.log(words.sort().join(","), words.join(","));
})();

//  ---- 并自 020-array-sort-strings-and-mixed.ts ----
(() => {
console.log([10, 9, 1].sort().join(","));
console.log([10, 9, 1].sort((a, b) => a - b).join(","));
console.log(["b", "a", "C"].sort().join(","));
console.log([3, 1, 2].sort((a, b) => b - a).join(","));
})();

//  ---- 并自 026-array-sort-default-lexicographic.ts ----
(() => {
const xs = [10, 9, 100, 1];
const back = xs.sort();
console.log(xs.join(","), back === xs);
const ys: any[] = ["b", undefined, "a", "c"];
console.log(ys.sort().join("|"));
console.log([3, 1, 2].sort((a, b) => b - a).join(","));
})();

//  ---- 并自 037-array-sort-stability-and-default.ts ----
(() => {
const rows = [{ k: 1, n: "a" }, { k: 1, n: "b" }, { k: 0, n: "c" }];
rows.sort((x, y) => x.k - y.k);
console.log(rows.map((r) => r.n).join(","));
console.log([10, 9, 1].sort().join(","), [10, 9, 1].sort((a, b) => a - b).join(","));
})();

//  ---- 并自 053-array-sort-undefined-and-holes.ts ----
(() => {
const xs: any[] = [3, undefined, 1, , 2];
console.log(xs.sort().join(","), xs.length, 4 in xs);
})();

//  ---- 并自 064-array-sort-stability-r323.ts ----
(() => {
const rows = [{ k: 1, i: "a" }, { k: 0, i: "b" }, { k: 1, i: "c" }, { k: 0, i: "d" }];
console.log(rows.sort((p, q) => p.k - q.k).map((r) => r.i).join(""));
console.log([10, 9, 1, 2].sort().join(","));
})();

//  ---- 并自 066-array-sort-forms.ts ----
(() => {
console.log([10, 9, 100, 1].sort().join(","));
console.log([10, 9, 100, 1].sort((a, b) => a - b).join(","));
console.log(["b", "a", "C"].sort().join(","));
console.log([3, 1, 2].sort(() => 0).join(","));
})();

//  ---- 并自 071-array-sort-stability-and-holes.ts ----
(() => {
const rows = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 1, n: "c" }, { k: 0, n: "d" }];
console.log(rows.slice().sort((x, y) => x.k - y.k).map((r) => r.n).join(""));
const mixed: any[] = [3, undefined, 1, , 2];
console.log(JSON.stringify(mixed.slice().sort()));
console.log(JSON.stringify([10, 9, 100].sort()));
})();

//  ---- 并自 091-array-sort-r623.ts ----
(() => {
console.log([10, 9, 1].sort().join(","));
console.log([10, 9, 1].sort((x, y) => x - y).join(","));
const rows = [{ k: 1, v: "a" }, { k: 0, v: "b" }, { k: 1, v: "c" }];
console.log(rows.sort((x, y) => x.k - y.k).map((r) => r.v).join(""));
console.log(["b", "a"].sort().join(","));
})();

//  ---- 并自 094-array-sort-comparator-nan.ts ----
(() => {
const xs = [3, 1, 2];
console.log(JSON.stringify(xs.sort(() => NaN)));
console.log(JSON.stringify(["b", "a", "c"].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))));
})();

//  ---- 并自 096-array-sort-comparator-forms.ts ----
(() => {
const xs = [3, 1, 2];
const same = xs.sort((a, b) => a - b);
console.log(same === xs, xs.join(","));
const ys = [3, 1, 2];
console.log(ys.sort((a, b) => a / 1000 - b / 1000).join(","), ys.join(","));
const recs = [{ k: 1, t: "a" }, { k: 1, t: "b" }, { k: 0, t: "c" }];
console.log(recs.sort((a, b) => a.k - b.k).map((r) => r.t).join(","));
console.log([10, 9, 1].sort().join(","));
})();

//  ---- 并自 100-array-sort-stability-root.ts ----
(() => {
const xs = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 1, n: "c" }, { k: 0, n: "d" }];
console.log(xs.sort((x, y) => x.k - y.k).map((x) => x.n).join(""));
const ys = [3, 1, 2];
console.log(ys.sort().join(","), ys.sort((a, b) => b - a).join(","));
console.log([10, 9, 1].sort().join(","), [10, 9, 1].sort((a, b) => a - b).join(","));
})();

//  ---- 并自 105-array-sort-stability-and-comparator.ts ----
(() => {
const rows = [{ k: 2, i: 0 }, { k: 1, i: 1 }, { k: 2, i: 2 }, { k: 1, i: 3 }];
rows.sort((a, b) => a.k - b.k);
console.log(rows.map((r) => r.i).join(","));
console.log([10, 9, 100].sort().join(","));
console.log([10, 9, 100].sort((a, b) => a - b).join(","));
})();

//  ---- 并自 110-array-sort-stability-r9.ts ----
(() => {
console.log([10, 9, 1].sort().join(","));
const items = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 1, n: "c" }];
items.sort((x, y) => x.k - y.k);
console.log(items.map((i) => i.n).join(""));
const mixed = [3, 1, 2];
console.log(mixed.sort().join(","), mixed.join(","));
})();

//  ---- 并自 119-sort-edges.ts ----
(() => {
const rows: any = [{ k: 2, id: 'a' }, { k: 1, id: 'b' }, { k: 2, id: 'c' }, { k: 1, id: 'd' }];
const stable = rows.slice().sort((x: any, y: any) => x.k - y.k);
try { console.log("stable", String(stable.map((r: any) => r.id).join(''))); } catch (e) { console.log("stable", "ERR", String(e && e.name)); }
try { console.log("zero", String([3, 1, 2].sort(() => 0).join(','))); } catch (e) { console.log("zero", "ERR", String(e && e.name)); }
try { console.log("strings", String(['10', '9', '1'].sort().join(','))); } catch (e) { console.log("strings", "ERR", String(e && e.name)); }
try { console.log("numbers", String([10, 9, 1].sort((a, b) => a - b).join(','))); } catch (e) { console.log("numbers", "ERR", String(e && e.name)); }
})();

//  ---- 并自 128-sort-nan-and-holes.ts ----
(() => {
const a: any = [3, 1, 2];
console.log(JSON.stringify(a.sort(() => NaN)));
const h: any = [3, , 1];
console.log(h.length, h.sort().join(","));
console.log(JSON.stringify(Object.keys(h)));
})();

//  ---- 并自 138-sort-default-string.ts ----
(() => {
const a: any = [10, 9, 100, 1];
console.log(JSON.stringify(a.sort()));
console.log(JSON.stringify([3, 1, 2].sort((x: any, y: any) => y - x)));
console.log(JSON.stringify(["b", "a", "C"].sort()));
})();

//  ---- 并自 139-sort-stability.ts ----
(() => {
const a: any = [{ k: 1, i: 0 }, { k: 1, i: 1 }, { k: 0, i: 2 }, { k: 1, i: 3 }];
console.log(a.sort((x: any, y: any) => x.k - y.k).map((e: any) => e.i).join(","));
})();

//  ---- 并自 146-sort-undefined-and-stability.ts ----
(() => {
const a: any = [3, undefined, 1, undefined, 2];
let sawUndefined = false;
console.log(JSON.stringify(a.sort((x: any, y: any) => { if (x === undefined || y === undefined) sawUndefined = true; return x - y; })), sawUndefined);
const h: any = [3, , 1];
h.sort();
console.log(JSON.stringify(h), 1 in h);
const m: any = [undefined, , , 2];
m.sort();
console.log(JSON.stringify(m), 1 in m);
})();

//  ---- 并自 152-array-sort-throw-cleanup.ts ----
(() => {
const a: any = [3, 1, 2];
try {
  a.sort((x: any, y: any) => { if (x === 1 || y === 1) throw new Error("boom"); return x - y; });
} catch (e: any) { console.log("caught", e.message); }
console.log(a.length, a.every((v: any) => typeof v === "number"));
})();
