// xl:title `Array` 构造器 / `of` / `from` / `isArray`：三种造的写法
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe-a06 · probe-a07 · probe-a08 · probe-a36 · probe-a39 · probe-a40 · probe693-a25 ·
//   probe693-a26 · probe693-a27 · probe693-a28 · probe693-a29 · probe693-a30 ·
//   probe694-a04 · probe694-a05 · probe694-a06 · probe694-a07 · probe694-a08 ·
//   probe703-a-b20 · probe703-a-b22 · probe703-a-b23 · probe703-a-b24 · probe703-a-b39 ·
//   probe703-a-b40 · probe703-a-b47 · probe703-a-b48 · probe704-a-f07 · probe704-a-f09 ·
//   probe704-a-f19 · p-arr-from-arraylike · p-arr-from-mapfn · p-arr-from-hole-fill
//   ＋ `007-array-isarray-from` / `009-array-of-root` / `024-array-from-mapfn-and-sources`
//     / `036-array-from-length-and-mapfn` / `049-array-of-and-from-forms` / `055-array-from-holes-and-length`
//     / `072-array-from-mapfn-thisarg` / `080-array-from-iterable-forms` / `081-array-of-and-isarray`
//     / `088-array-of-r623` / `095-array-from-mapper-thisarg` / `098-array-from-literals-and-sets`
//     / `103-array-isarray` / `121-array-from-mapfn` / `122-array-from-iterables` / `129-array-from-map-iterable`
//
// 判定点只有一个：**三条造数组的路各收什么**——
//  ① `new Array(n)`：单个数字实参 = 造 **n 个洞**（不是 `[n]`）；多实参或非数字 = 元素；
//  ② `Array.of(…)`：永远按元素收（`Array.of(3)` 给 `[3]`，`Array.of()` 给 `[]`）；
//  ③ `Array.from(…)`：吃可迭代物与**类数组**（只有 `length` 的对象按洞补 `undefined`、
//     映射函数第二个实参是下标）；字符串按**码点**切；
//  ④ `Array.isArray`：只有真数组（含 `Array.prototype`）给真，类数组给假。
//   `007-array-isarray-from` · `009-array-of-root` · `024-array-from-mapfn-and-sources` · `036-array-from-length-and-mapfn` · `049-array-of-and-from-forms` · `055-array-from-holes-and-length` · `072-array-from-mapfn-thisarg` · `080-array-from-iterable-forms` · `081-array-of-and-isarray` · `088-array-of-r623` · `095-array-from-mapper-thisarg` · `098-array-from-literals-and-sets` · `103-array-isarray` · `121-array-from-mapfn` · `122-array-from-iterables` · `129-array-from-map-iterable` · `008-array-from-arraylike` · `011-array-spread-conditional` · `063-array-fromasync`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `007-array-isarray-from` · `009-array-of-root` · `024-array-from-mapfn-and-sources` · `036-array-from-length-and-mapfn` · `049-array-of-and-from-forms` · `055-array-from-holes-and-length` · `072-array-from-mapfn-thisarg` · `080-array-from-iterable-forms` · `081-array-of-and-isarray` · `088-array-of-r623` · `095-array-from-mapper-thisarg` · `098-array-from-literals-and-sets` · `103-array-isarray` · `121-array-from-mapfn` · `122-array-from-iterables` · `129-array-from-map-iterable` · `008-array-from-arraylike` · `011-array-spread-conditional` · `063-array-fromasync`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(new Array(3).length));
  console.log(show(Array(1, 2).length));
  console.log(show(Array.of(3).length));
  console.log(show(Array.of(1, 2).join(",")));
  console.log(show(Array.of().length));
  console.log(show(Array.of(1, 2).length));
  console.log(show(Array.from({ length: 2 }).length));
  console.log(show(Array.from({ length: 2 }).join(",")));
  console.log(show(Array.from({ length: 2, 0: "a", 1: "b" }).join(",")));
  console.log(show(Array.from([1, 2], (x: any) => x * 2).join(",")));
  console.log(show(Array.from({ length: 2 }, (_: any, i: any) => i).join(",")));
  console.log(show(Array.from("ab").join(",")));
  console.log(show(Array.from("abc").join(",")));
  console.log(show(Array.from(new Set([1, 2, 2])).join(",")));
  console.log(show(Array.from([, 1]).length));
  console.log(show(Array.from([, 1])[0]));
  console.log(show(Array.isArray([])));
  console.log(show(Array.isArray(Array.prototype)));
  console.log(show(Array.isArray({ length: 0 })));
  console.log(show([].length));
  console.log(show([, ,].length));
  console.log(show([, 1].length));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 007-array-isarray-from.ts ----
(function () {
console.log(Array.isArray([]), Array.isArray({}), Array.isArray("ab" as any));
console.log(Array.from("abc").join(","), Array.from(new Set([1, 2])).join(","));
console.log(Array.from([1, 2], (v) => v * 3).join(","));
})();
//  ---- 并自 009-array-of-root.ts ----
(function () {
console.log(Array.of(3).length, Array.of(3)[0], new Array(3).length, new Array(3)[0]);
console.log(Array.of(1, 2, 3).join(","), Array.of().length);
})();
//  ---- 并自 024-array-from-mapfn-and-sources.ts ----
(function () {
console.log(Array.from([1, 2], (v) => v * 2).join(","));
console.log(Array.from("abc").join("-"), Array.from("abc").length);
console.log(Array.from(new Set([1, 2, 2])).join(","));
console.log(JSON.stringify(Array.from(new Map([["a", 1]]))));
console.log(Array.from({ length: 3 }, (_: any, i: number) => i).join(","));
})();
//  ---- 并自 036-array-from-length-and-mapfn.ts ----
(function () {
console.log(Array.from({ length: 3 }, (_v, i) => i * 2).join(","));
console.log(Array.from("abc").join("-"));
console.log(Array.from(new Set([1, 1, 2])).join(","));
})();
//  ---- 并自 049-array-of-and-from-forms.ts ----
(function () {
console.log(Array.of(1, 2, 3).join(","), Array.of(3).length, new Array(3).length);
console.log(Array.from([1, 2], (x) => x * 2).join(","));
console.log(Array.from({ length: 3 }, (_, i) => i).join(","));
})();
//  ---- 并自 055-array-from-holes-and-length.ts ----
(function () {
console.log(Array.from({ length: 3 }, (_, i) => i * 2).join(","));
console.log(Array.from({ 0: "a", 2: "c", length: 3 }).join(","));
})();
//  ---- 并自 072-array-from-mapfn-thisarg.ts ----
(function () {
console.log(Array.from("abc").join("-"));
console.log(Array.from({ length: 3, 0: "x" } as any).map((v: any) => String(v)).join(","));
console.log(Array.from([1, 2, 3], (v: number) => v * 2).join(","));
console.log(Array.from(new Set([1, 1, 2])).join(","));
console.log(Array.from({ length: 2 }, (_: unknown, i: number) => i).join(","));
})();
//  ---- 并自 080-array-from-iterable-forms.ts ----
(function () {
console.log(Array.from(new Map([["a", 1]])).length, JSON.stringify(Array.from(new Map([["a", 1]]))));
console.log(Array.from(new Set("abc")).join("-"));
function* gen() { yield 1; yield 2; }
console.log(Array.from(gen()).join(","));
const custom = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: i++, done: false } : { value: undefined, done: true }) }; } };
console.log(Array.from(custom as any).join(","));
})();
//  ---- 并自 081-array-of-and-isarray.ts ----
(function () {
console.log(JSON.stringify(Array.of(1, 2)), JSON.stringify(Array.of(3)), JSON.stringify(Array.of()));
console.log(JSON.stringify(new Array(3)), new Array(3).length, JSON.stringify(new Array(1, 2)));
console.log(Array.isArray([]), Array.isArray("ab" as any), Array.isArray(new Array(0)));
console.log(Array.isArray(Array.prototype), JSON.stringify([...new Array(3)]));
})();
//  ---- 并自 088-array-of-r623.ts ----
(function () {
console.log(Array.of(3).length, Array.of(3).join(","), new Array(3).length);
console.log(Array.of(1, 2).join(","), Array.isArray([]), Array.isArray("x"));
})();
//  ---- 并自 095-array-from-mapper-thisarg.ts ----
(function () {
const ctx = { k: 10 };
const out = Array.from([1, 2], function (v) { return v + this.k; }, ctx);
console.log(JSON.stringify(out));
console.log(JSON.stringify(Array.from("abc")), JSON.stringify(Array.from(new Set([1, 1, 2]))));
console.log(JSON.stringify(Array.from({ length: 3 }, (_, i) => i * 2)));
})();
//  ---- 并自 098-array-from-literals-and-sets.ts ----
(function () {
function* g() { yield 1; yield 2; }
console.log(Array.from("abc").join(","), Array.from(new Set([1, 1, 2])).join(","));
console.log(Array.from(new Map([["a", 1]])).map((p) => p.join("=")).join(","));
console.log(Array.from(g()).join(","), Array.isArray(Array.from("ab")));
})();
//  ---- 并自 103-array-isarray.ts ----
(function () {
console.log(Array.isArray([]), Array.isArray({ length: 0 }), Array.isArray("a"));
console.log(Array.isArray(new Array(3)), Array.isArray(Array.prototype), Array.isArray(null));
})();
//  ---- 并自 121-array-from-mapfn.ts ----
(function () {
try { console.log("mapfn", String(Array.from({ length: 3 }, (v: any, i: any) => i * 2).join(','))); } catch (e) { console.log("mapfn", "ERR", String(e && e.name)); }
try { console.log("string-map", String(Array.from('ab', (ch: any) => ch.toUpperCase()).join(''))); } catch (e) { console.log("string-map", "ERR", String(e && e.name)); }
try { console.log("set", String(Array.from(new Set(['x', 'y'])).join(','))); } catch (e) { console.log("set", "ERR", String(e && e.name)); }
try { console.log("arraylike-args", String(Array.from([1, 2], (x: any) => x + 1).join(','))); } catch (e) { console.log("arraylike-args", "ERR", String(e && e.name)); }
})();
//  ---- 并自 122-array-from-iterables.ts ----
(function () {
function* g() { yield 1; yield 2; }
try { console.log("from-generator", String(Array.from(g()).join(','))); } catch (e) { console.log("from-generator", "ERR", String(e && e.name)); }
try { console.log("spread-generator", String([...g()].join(','))); } catch (e) { console.log("spread-generator", "ERR", String(e && e.name)); }
try { console.log("from-map-fn", String(Array.from('abc', (ch: any) => ch.toUpperCase()).join(''))); } catch (e) { console.log("from-map-fn", "ERR", String(e && e.name)); }
try { console.log("from-arraylike", String(Array.from({ length: 2, 0: 'x', 1: 'y' }).join(''))); } catch (e) { console.log("from-arraylike", "ERR", String(e && e.name)); }
})();
//  ---- 并自 129-array-from-map-iterable.ts ----
(function () {
console.log(JSON.stringify(Array.from("abc", (c: any, i: any) => c + i)));
console.log(JSON.stringify(Array.from(new Set([1, 1, 2]))));
console.log(JSON.stringify(Array.from({ length: 3 }, (_: any, i: any) => i)));
})();
//  ---- 并自 008-array-from-arraylike.ts ----
(function () {
console.log(Array.from({ a: 1 } as any).length);
})();
//  ---- 并自 011-array-spread-conditional.ts ----
(function () {
const xs = [1, 2];
const ys = [3];
console.log([...xs.length ? xs : ys].join(","));
console.log([...(xs.length ? xs : ys)].join(","));
})();
//  ---- 并自 063-array-fromasync.ts ----
(function () {
async function* page() { yield 1; yield 2; yield 3; }
async function main() {
  const xs = await Array.fromAsync(page());
  console.log(xs.join(","));
  console.log((await Array.fromAsync([1, 2], (v) => Promise.resolve(v * 2))).join(","));
}
main();
})();
