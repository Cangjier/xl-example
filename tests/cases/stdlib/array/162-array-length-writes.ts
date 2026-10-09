// xl:title 数组的 `length`：截断、放大成洞、越界赋值与不可写那一档
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe693-a12 · probe693-a13 · probe693-a14 · probe693-a15 · probe693-a47 ·
//   probe693-a48 · probe693-a49 · probe693-a58 · probe703-a-b19 · probe703-a-b18 ·
//   probe703-a-b50
//   ＋ `012-array-length-write` / `042-array-length-shrink-and-grow` / `060-array-length-nonwritable`
//     / `078-array-length-write-forms` / `084-array-length-range` / `130-array-ctor-holes`
//     / `141-length-nonwritable-array` / `p-arr-length-truncate`
//
// 判定点只有一个：**`length` 那一格与下标格的联动**——
//  ① 写小：**真删掉**后面那些格（`join` 跟着短，`length` 是写的那个数）；
//  ② 写大：中间那一段变成**洞**（`in` 假、`join` 给空串、`length` 是写的那个数）；
//  ③ 越界赋值 `a[5] = 6` 把 `length` 顶到 6；负下标 / 非下标字符串键**不动** `length`；
//  ④ 非法值（负数 / 小数 / 超过 2^32-1）抛 `RangeError`；
//  ⑤ `length` 被设成不可写之后 `push` 抛 `TypeError`。
//   `012-array-length-write` · `042-array-length-shrink-and-grow` · `060-array-length-nonwritable` · `078-array-length-write-forms` · `084-array-length-range` · `130-array-ctor-holes` · `141-length-nonwritable-array` · `079-array-index-and-length-key`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `012-array-length-write` · `042-array-length-shrink-and-grow` · `060-array-length-nonwritable` · `078-array-length-write-forms` · `084-array-length-range` · `130-array-ctor-holes` · `141-length-nonwritable-array` · `079-array-index-and-length-key`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  const cut: any = [1, 2, 3];
  cut.length = 1;
  console.log(show(cut.join(",") + "|" + cut.length));
  const grow: any = [1];
  grow.length = 3;
  console.log(show(grow.join(",") + "|" + (1 in grow)));
  const zero: any = [1, 2, 3];
  zero.length = 0;
  console.log(show(zero.join(",") + zero.length));
  const del: any = [1, 2, 3];
  delete del[1];
  console.log(show(del.join(",") + "|" + del.length));
  const long: any = [1, 2];
  long[5] = 6;
  console.log(show(long.length));
  const neg: any = [];
  neg[-1] = 1;
  console.log(show(neg.length + "," + neg[-1]));
  const str: any = [1, 2];
  str["1"] = 9;
  console.log(show(str.join(",") + "|" + str.length));
  console.log(show(err(() => { const a: any = [1]; a.length = -1; return a.length; })));
  console.log(show(err(() => { const a: any = [1]; a.length = 1.5; return a.length; })));
  console.log(show(err(() => { const a: any = [1]; a.length = 4294967296; return a.length; })));
  console.log(show(err(() => {
    const a: any = [1];
    Object.defineProperty(a, "length", { writable: false });
    a.push(2);
    return a.length;
  })));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 012-array-length-write.ts ----
(function () {
const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(xs.join(","), xs.length);
xs.length = 4;
console.log(xs.join(","), xs.length, xs[3]);
})();
//  ---- 并自 042-array-length-shrink-and-grow.ts ----
(function () {
const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(xs.join(","), xs.length);
xs.length = 4;
console.log(xs.length, xs[3], xs.join(","));
xs[9] = "x";
console.log(xs.length, xs.join(","));
})();
//  ---- 并自 060-array-length-nonwritable.ts ----
(function () {
const xs: any = [1, 2];
Object.defineProperty(xs, "length", { writable: false });
try {
  xs.push(3);
  console.log("pushed", xs.length);
} catch (e) {
  console.log("threw", (e as Error).name);
}
})();
//  ---- 并自 078-array-length-write-forms.ts ----
(function () {
const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(JSON.stringify(xs), xs.length);
xs.length = 4;
console.log(JSON.stringify(xs), xs.length, 2 in xs);
try { xs.length = -1; } catch (e) { console.log((e as Error).name); }
try { xs.length = 1.5; } catch (e) { console.log((e as Error).name); }
})();
//  ---- 并自 084-array-length-range.ts ----
(function () {
const xs: any[] = [1, 2, 3, 4];
xs.length = 2;
console.log("A", JSON.stringify(xs), xs.length);
xs.length = 4;
console.log("B", JSON.stringify(xs), xs.length, 2 in xs);
try { xs.length = -1; } catch (e) { console.log("C", (e as Error).name); }
try { xs.length = 1.5; } catch (e) { console.log("D", (e as Error).name); }
try { xs.length = 4294967296; } catch (e) { console.log("E", (e as Error).name); }
console.log("F", xs.length);
const obj: any = { length: 3 };
console.log("G", obj.length, Array.from({ length: 3 }, (_v, i) => i).join(","));
})();
//  ---- 并自 130-array-ctor-holes.ts ----
(function () {
const a: any = new Array(3);
console.log(a.length, 0 in a, JSON.stringify(a));
console.log(JSON.stringify([...a.keys()]));
console.log(JSON.stringify(a.map(() => 1)));
console.log(JSON.stringify(a.fill(0)));
})();
//  ---- 并自 141-length-nonwritable-array.ts ----
(function () {
const a: any = [1, 2, 3, 4];
a.length = 2;
console.log(a.length, JSON.stringify(a), a[3]);
a.length = 4;
console.log(a.length, JSON.stringify(a));
})();
//  ---- 并自 079-array-index-and-length-key.ts ----
(function () {
const xs: any[] = [1, 2, 3];
xs["3"] = 4;
console.log(xs.length, JSON.stringify(xs));
xs["01"] = 5;
console.log(xs.length, xs["01"]);
console.log(Object.keys(xs).join(","));
console.log(JSON.stringify(Object.keys([, , 1])));
})();
