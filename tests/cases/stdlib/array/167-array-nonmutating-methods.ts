// xl:title 不改原数组的那几支：`toSorted` / `toReversed` / `toSpliced` / `with` / `findLast`
// xl:round 692
// xl:judge stdout
// xl:end
// **第 810 轮（合并）**：这一条是它那个判定点的**唯一**一条——早先它自称已经合并过这些文件，
//  而那些文件**一直还在盘上**（同判定点重复、分母被灌水）。这一轮把它们的正文**逐字**接在
//  下面（每块一个 IIFE、块首写明出处），**源文件从盘上删掉**；并组完整性由一把一次性尺子核对：
//  合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各被并条 stdout 的顺次相接」
//  **逐字节相同**（两侧都中）。
// **合并了原先同一个判定点的二十余条**：
//   probe694-a15 · probe694-a16 · probe694-a17 · probe698-a07 · probe703-a-b06 ·
//   probe703-a-b07 · probe703-a-b08 · probe696-r21 · probe696-r22 · probe696-r23 · probe696-r24
//   ＋（第 810 轮下盘的 14 条，正文见下面各块）
//
// 判定点只有一个：**这一族的「不改原数组」是硬判据**——
//  ① `toSorted` / `toReversed` / `toSpliced` / `with` 各自交一个**新数组**，原数组逐字节不变；
//  ② `with(i, v)` 越界（含负下标越界）抛 `RangeError`；
//  ③ `toSpliced` 的三格实参与 `splice` 同口径，只是不动原数组；
//  ④ 这一族与变异版（`sort` / `reverse` / `splice`）的读数**必须并排对照**才看得出区别。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  const src: any = [3, 1, 2];
  console.log(show(src.toSorted().join(",")));
  console.log(show(src.join(",")));
  console.log(show([2, 1].toSorted((x: any, y: any) => x - y).join(",")));
  console.log(show([1, 2, 3].toReversed().join(",")));
  console.log(show([1, 2, 3].toSpliced(1, 1).join(",")));
  console.log(show([1, 2, 3].with(0, 9).join(",")));
  console.log(show(src.with ? "has" : "no"));
  console.log(show([1, 2, 3].toReversed ? "has" : "no"));
  console.log(show([3, 1, 2].toSorted ? "has" : "no"));
  console.log(show([1, 2, 3].find ? "has" : "no"));
  console.log(show(err(() => [1, 2].with(5, 0))));
  console.log(show(err(() => [1, 2].with(-3, 0))));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

//  ---- 并自 021-array-tosorted-and-with.ts ----
(() => {
const xs = [3, 1, 2];
console.log(xs.toSorted((a, b) => a - b).join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(1, 9).join(","), xs.join(","));
})();

//  ---- 并自 027-array-with-and-tosorted-forms-root.ts ----
(() => {
const xs = [1, 2, 3];
console.log(xs.with(1, 9).join(","), xs.join(","));
console.log(xs.with(-1, 8).join(","));
console.log(xs.toSorted((a, b) => b - a).join(","), xs.toReversed().join(","));
})();

//  ---- 并自 045-array-with-and-tosorted-forms-r291.ts ----
(() => {
const xs = [3, 1, 2];
console.log(xs.toSorted().join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(0, 9).join(","), xs.join(","));
console.log(xs.toSorted((a, b) => b - a).join(","));
})();

//  ---- 并自 046-array-tospliced.ts ----
(() => {
const xs = [1, 2, 3, 4];
console.log(xs.toSpliced(1, 2, "a", "b").join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(0, 9).join(","), xs.join(","));
})();

//  ---- 并自 062-array-tospliced-and-with.ts ----
(() => {
const xs = [1, 2, 3];
console.log(xs.toSpliced(1, 1, 9).join(","), xs.with(0, 7).join(","), xs.join(","));
})();

//  ---- 并自 065-array-flat-and-with.ts ----
(() => {
console.log([1, [2, [3, [4]]]].flat().join(","), [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
const xs = [3, 1, 2];
console.log(xs.with(0, 9).join(","), xs.toSorted().join(","), xs.toReversed().join(","), xs.join(","));
})();

//  ---- 并自 068-array-tospliced-and-reversed.ts ----
(() => {
const xs = [3, 1, 2];
console.log(JSON.stringify(xs.toSorted()), JSON.stringify(xs.toSorted((a: number, b: number) => b - a)));
console.log(JSON.stringify(xs.toReversed()), JSON.stringify(xs.with(1, 9)));
console.log(JSON.stringify(xs.toSpliced(1, 1, 7, 8)));
console.log(JSON.stringify(xs));
try { console.log(JSON.stringify(xs.with(9, 0))); } catch (e) { console.log((e as Error).name); }
})();

//  ---- 并自 087-array-findlast-tosorted.ts ----
(() => {
const a = [5, 1, 4, 2];
console.log(a.findLast((x) => x % 2 === 0), a.findLastIndex((x) => x > 3));
console.log(a.toSorted((x, y) => x - y).join(","), a.join(","));
console.log(a.toReversed().join(","), a.with(1, 9).join(","), a.join(","));
})();

//  ---- 并自 092-toreversed-tospliced-tosorted.ts ----
(() => {
const xs = [3, 1, 2];
console.log(JSON.stringify(xs.toReversed()), JSON.stringify(xs.toSorted()), JSON.stringify(xs));
console.log(JSON.stringify(xs.toSpliced(1, 1, 9, 8)), JSON.stringify(xs));
console.log(JSON.stringify(xs.with(0, 7)), JSON.stringify(xs.with(-1, 5)));
console.log(JSON.stringify(xs));
})();

//  ---- 并自 093-array-with-out-of-range.ts ----
(() => {
const xs = [1, 2, 3];
try { xs.with(3, 0); } catch (e) { console.log(e instanceof RangeError, e.name); }
try { xs.with(-4, 0); } catch (e) { console.log(e instanceof RangeError, e.name); }
console.log(JSON.stringify(xs.with(1.0, 9)));
})();

//  ---- 并自 107-array-findlast-and-with.ts ----
(() => {
const a = [1, 2, 3, 4];
console.log(a.findLast((x) => x % 2 === 0), a.findLastIndex((x) => x < 3));
console.log(JSON.stringify(a.toReversed()), JSON.stringify(a.toSorted((x, y) => y - x)));
console.log(JSON.stringify(a.with(1, 9)), JSON.stringify(a));
})();

//  ---- 并自 112-l677p-arr-nonmutating-family.ts ----
(() => {
const xs = [3, 1, 2];
console.log(xs.toSorted().join(","), xs.join(","), xs.toSorted((a, b) => b - a).join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.toSpliced(1, 1).join(","), xs.toSpliced(1, 0, 9).join(","), xs.join(","));
console.log(xs.with(0, 9).join(","), xs.join(","));
console.log(typeof xs.with, typeof xs.toSorted, typeof xs.toReversed, typeof xs.toSpliced);
try {
  console.log(xs.with(9, 1));
} catch (e) {
  console.log(e.constructor.name, e instanceof RangeError);
}
})();

//  ---- 并自 116-arg-array-tosort.ts ----
(() => {
try { console.log("toSorted", String([3, 1, 2].toSorted())); } catch (e) { console.log("toSorted", "ERR", String(e && e.name)); }
try { console.log("toSorted-cmp", String([3, 1, 2].toSorted((x, y) => y - x))); } catch (e) { console.log("toSorted-cmp", "ERR", String(e && e.name)); }
try { console.log("with-1", String([1, 2, 3].with(1, 9))); } catch (e) { console.log("with-1", "ERR", String(e && e.name)); }
try { console.log("with--1", String([1, 2, 3].with(-1, 9))); } catch (e) { console.log("with--1", "ERR", String(e && e.name)); }
try { console.log("with-out", String([1, 2, 3].with(5, 9))); } catch (e) { console.log("with-out", "ERR", String(e && e.name)); }
try { console.log("toSpliced", String([1, 2, 3].toSpliced(1, 1, 'x'))); } catch (e) { console.log("toSpliced", "ERR", String(e && e.name)); }
try { console.log("toReversed", String([1, 2, 3].toReversed())); } catch (e) { console.log("toReversed", "ERR", String(e && e.name)); }
})();

//  ---- 并自 127-tosorted-toreversed-with.ts ----
(() => {
const a: any = [3, 1, 2];
console.log(JSON.stringify(a.toSorted()));
console.log(JSON.stringify(a.toReversed()));
console.log(JSON.stringify(a.with(1, 9)));
console.log(JSON.stringify(a));
})();
