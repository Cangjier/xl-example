// xl:title `fill` / `copyWithin`：负区间、越界与重叠复制
// xl:round 692
// xl:judge stdout
// xl:end
// **第 810 轮（合并）**：这一条是它那个判定点的**唯一**一条——早先它自称已经合并过这些文件，
//  而那些文件**一直还在盘上**（同判定点重复、分母被灌水）。这一轮把它们的正文**逐字**接在
//  下面（每块一个 IIFE、块首写明出处），**源文件从盘上删掉**；并组完整性由一把一次性尺子核对：
//  合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各被并条 stdout 的顺次相接」
//  **逐字节相同**（两侧都中）。
// **合并了原先同一个判定点的二十余条**：
//   probe-a32 · probe693-a09 · probe693-a10 · probe693-a11 · probe694-a09 · probe694-a10 ·
//   probe694-a20 · probe694-a21 · probe696-h17 · probe696-h23 · probe703-a-b10 ·
//   probe703-a-b11 · probe704-a-f08 · p-arr-copywithin · p-arr-fill-negative
//   ＋（第 810 轮下盘的 9 条，正文见下面各块）
//
// 判定点只有一个：**两个下标参数的规范化**——
//  ① `fill(value, start, end)`：负下标从尾数；`end` 缺省到尾巴；`start` 越界什么都不做；
//     不写 `value` 就是 `undefined`；
//  ② `copyWithin(target, start, end)`：同样三格实参与负下标；**重叠时按拷贝方向处理**
//     （先取出来再写，不会出现「边写边读」的错位）；
//  ③ 两者都返回**原数组**、都是原地改。
//   `115-arg-array-range`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `115-arg-array-range`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([1, 2, 3].fill(0, 1, 2).join(",")));
  console.log(show([1, 2, 3].fill(0, 1).join(",")));
  console.log(show([1, 2, 3].fill(0, -1).join(",")));
  console.log(show([1, 2, 3].fill(0, 3).join(",")));
  console.log(show(Array(3).fill(0).join(",")));
  console.log(show(new Array(2).fill(7).length));
  console.log(show(new Array(3).fill(1).join("")));
  console.log(show([1, 2, 3].copyWithin(0, 1).join(",")));
  console.log(show([1, 2, 3].copyWithin(-1).join(",")));
  const ov: any = [1, 2, 3, 4, 5];
  console.log(show(ov.copyWithin(1, 0, 3).join(",")));
  const back: any = [1, 2, 3, 4, 5];
  console.log(show(back.copyWithin(0, 1, 4).join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

//  ---- 并自 016-array-copywithin-root.ts ----
(() => {
const a = [1, 2, 3, 4, 5];
console.log(a.copyWithin(0, 3).join(","));
const b = [1, 2, 3, 4, 5];
console.log(b.copyWithin(1, 0, 2).join(","));
const c = [1, 2, 3, 4, 5];
console.log(c.copyWithin(-2, 0).join(","), c.length);
})();

//  ---- 并自 040-array-fill-and-copywithin-negative-r291.ts ----
(() => {
const a = [1, 2, 3, 4];
console.log(a.fill(0, 1, 3).join(","));
console.log([1, 2, 3, 4].fill(9, -2).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(0, 3).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(1, -2).join(","));
})();

//  ---- 并自 048-array-fill-and-copywithin-forms.ts ----
(() => {
console.log([1, 2, 3, 4, 5].fill(0, -2).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(0, 3).join(","), [1, 2, 3].copyWithin(1, -1).join(","));
console.log([1, 2, 3].fill(9).join(","));
console.log([1, 2, 3, 4].fill(9, 1, -1).join(","));
console.log([1, 2, 3, 4, 5].copyWithin(-2, 0).join(","));
})();

//  ---- 并自 069-array-fill-and-copywithin-negative-r371.ts ----
(() => {
console.log(JSON.stringify([1, 2, 3, 4].fill(0, 1, 3)));
console.log(JSON.stringify([1, 2, 3, 4].fill(9, -2)));
console.log(JSON.stringify([1, 2, 3, 4, 5].copyWithin(0, 3)));
console.log(JSON.stringify([1, 2, 3, 4, 5].copyWithin(1, -2, -1)));
console.log(JSON.stringify([1, 2, 3].copyWithin(0, 10)));
})();

//  ---- 并自 086-array-copywithin-fill.ts ----
(() => {
const a = [1, 2, 3, 4, 5];
console.log(a.copyWithin(0, 3).join(","));
console.log(a.copyWithin(1, -2).join(","));
console.log([1, 2, 3].fill(9, -2).join(","));
console.log([1, 2, 3].fill(0, 5).join(","));
})();

//  ---- 并自 099-array-fill-negative-and-undefined.ts ----
(() => {
const a = [1, 2, 3, 4];
console.log(a.fill(0, -2).join(","), a.join(","));
console.log([1, 2, 3].fill(9, 1, 1).join(","), [1, 2].fill(9, -1, -1).join(","));
console.log([1, 2].fill(undefined).map((v) => String(v)).join(","));
})();

//  ---- 并自 108-array-splice-copywithin-fill.ts ----
(() => {
const a = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.splice(1, 2, "x")), JSON.stringify(a));
console.log(JSON.stringify([1, 2, 3, 4].copyWithin(0, 2)));
console.log(JSON.stringify([1, 2, 3, 4].fill(0, 1, 3)));
console.log(JSON.stringify([1, 2, 3].fill(9, -1)));
})();

//  ---- 并自 111-array-copywithin-r676.ts ----
(() => {
const xs = [1, 2, 3, 4, 5];
console.log(xs.copyWithin(0, 3).join(","));
console.log([1, 2, 3, 4].copyWithin(1, -2).join(","));
console.log(xs.copyWithin(0, 1, 2).join(","));
})();

//  ---- 并自 131-copywithin-fill-range.ts ----
(() => {
const a: any = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.copyWithin(0, 3)));
console.log(JSON.stringify(a.fill(9, -2)));
console.log(JSON.stringify([1, 2, 3].copyWithin(-2, 0)));
})();
//  ---- 并自 115-arg-array-range.ts ----
(function () {
const f: any = [1, 2, 3, 4].fill(0, 1, 3);
const cp: any = [1, 2, 3, 4, 5].copyWithin(0, 3);
const eq: any = [1, 2, 3, 4].fill(0, -2);
try { console.log("fill", String(f)); } catch (e) { console.log("fill", "ERR", String(e && e.name)); }
try { console.log("copyWithin", String(cp)); } catch (e) { console.log("copyWithin", "ERR", String(e && e.name)); }
try { console.log("fill-neg", String(eq)); } catch (e) { console.log("fill-neg", "ERR", String(e && e.name)); }
try { console.log("slice--2", String([1, 2, 3].slice(-2))); } catch (e) { console.log("slice--2", "ERR", String(e && e.name)); }
try { console.log("slice-1--1", String([1, 2, 3].slice(1, -1))); } catch (e) { console.log("slice-1--1", "ERR", String(e && e.name)); }
try { console.log("slice--9", String([1, 2, 3].slice(-9))); } catch (e) { console.log("slice--9", "ERR", String(e && e.name)); }
})();
