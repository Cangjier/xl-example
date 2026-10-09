// xl:title `slice` / `splice` / `concat` / `reverse` / 栈队列那一族：返回值与实参个数
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe-a03 · probe-a10 · probe-a11 · probe-a12 · probe-a13 · probe-a20 · probe-a30 ·
//   probe-a31 · probe-a38 · probe693-a22 · probe693-a41 · probe693-a42 · probe693-a43 ·
//   probe693-a50 · probe693-a52 · probe693-a53 · probe693-a59 · probe693-a60 ·
//   probe694-a28 · probe694-a29 · probe694-a30 · probe696-h21 · probe696-h24 ·
//   probe696-r07（无关那一半）· probe703-a-b12 · probe703-a-b14 · probe703-a-b21 ·
//   probe703-a-b41 · probe703-a-b42 · probe703-a-b43 · probe703-a-b44 · probe703-a-b46 ·
//   probe704-a-f01 · probe704-a-f02 · probe704-a-f03 · p-arr-splice-return · p-arr-tosorted（无关那一半）
//   ＋ `002-array-slice-splice` / `003-array-reverse-concat` / `028-array-splice-forms`
//     / `044-array-splice-return-and-negative` / `070-array-splice-return-and-argc`
//     / `083-splice-argument-forms` / `132-splice-negative`
//
// 判定点只有一个：**这几支的返回什么、实参怎么数**——
//  ① `slice` 负下标从尾数、越界夹住（不改原数组）；
//  ② `splice` 返回**被删的那一段**（原数组被改）；不给第二个实参 = 删到尾巴；
//     `undefined` 当 0；
//  ③ `concat` 摊平**一层**、非数组实参原样接上；
//  ④ `reverse` / `push` / `pop` / `shift` / `unshift` 各自的返回值（`push` 给新长度、
//     `pop` 给弹出的值、`shift` 给被移走的那一个、`unshift` 给新长度）。
//   `028-array-splice-forms` · `044-array-splice-return-and-negative` · `070-array-splice-return-and-argc` · `083-splice-argument-forms` · `132-splice-negative` · `001-array-push-pop` · `002-array-shift-unshift` · `135-slice-negative`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `028-array-splice-forms` · `044-array-splice-return-and-negative` · `070-array-splice-return-and-argc` · `083-splice-argument-forms` · `132-splice-negative` · `001-array-push-pop` · `002-array-shift-unshift` · `135-slice-negative`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show([1, 2, 3].slice(-2).join(",")));
  console.log(show([1, 2, 3].slice(1, -1).join(",")));
  console.log(show([1, 2].slice().length));
  console.log(show([1, 2, 3].splice(1, 1).join(",") + "|" + [1, 2, 3].splice(1, 1).length.toString()));
  const sp: any = [1, 2, 3];
  console.log(show(sp.splice(1, 1).join(",") + "|" + sp.join(",")));
  console.log(show(sp.splice(0).length));
  console.log(show(sp.length));
  console.log(show([1, 2, 3].splice(-1).length));
  console.log(show([1, 2].concat([3], 4).length));
  console.log(show([].concat(1, [2, [3]]).length));
  console.log(show([1, 2, 3].concat().length));
  console.log(show([0].concat([]).length + "," + [].concat([1]).length));
  console.log(show([1, 2, 3].reverse().join(",")));
  console.log(show([1, 2, 3].reverse().length));
  console.log(show([1, 2, 3].push(4)));
  console.log(show([1, 2, 3].pop()));
  console.log(show([1, 2, 3].shift() + "|" + [1, 2, 3].shift().toString()));
  console.log(show([2, 3].unshift(1)));
  const st: any = [1, 2];
  st.unshift(0);
  console.log(show(st.join(",")));
  const pop: any = [1, 2, 3];
  console.log(show(pop.pop() + "|" + pop.length));
  const sh: any = [1, 2, 3];
  console.log(show(sh.shift() + "|" + sh.join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 028-array-splice-forms.ts ----
(function () {
const a = [1, 2, 3, 4];
console.log(a.splice(1, 1).join(","), a.join(","));
const b = [1, 2, 3, 4];
console.log(b.splice(1, 0, "x").length, b.join(","));
const c = [1, 2, 3];
console.log(c.splice(-2, 5).join(","), c.join(","));
})();
//  ---- 并自 044-array-splice-return-and-negative.ts ----
(function () {
const xs = [1, 2, 3, 4];
console.log(xs.splice(1, 2).join(","), xs.join(","));
console.log([1, 2, 3].splice(-1, 1).join(","));
console.log([1, 2, 3].splice(1).join(","), [1, 2, 3].splice(9).length);
})();
//  ---- 并自 070-array-splice-return-and-argc.ts ----
(function () {
const a = [1, 2, 3, 4];
console.log(JSON.stringify(a.splice(1, 2)), JSON.stringify(a));
const b = [1, 2, 3];
console.log(JSON.stringify(b.splice(1)), JSON.stringify(b));
const c = [1, 2, 3];
console.log(JSON.stringify(c.splice(-1)), JSON.stringify(c));
const d = [1, 2, 3];
console.log(JSON.stringify(d.splice()), JSON.stringify(d));
})();
//  ---- 并自 083-splice-argument-forms.ts ----
(function () {
const a = [1, 2, 3, 4];
console.log("A", JSON.stringify(a.splice()), JSON.stringify(a));
const b = [1, 2, 3];
console.log("B", JSON.stringify(b.splice(1)), JSON.stringify(b));
const c = [1, 2, 3];
console.log("C", JSON.stringify(c.splice(1, undefined)), JSON.stringify(c));
const d = [1, 2, 3];
console.log("D", JSON.stringify(d.splice(1, 0, 9)), JSON.stringify(d));
const e = [1, 2, 3];
console.log("E", JSON.stringify(e.splice(-2)), JSON.stringify(e));
const f = [1, 2, 3];
console.log("F", JSON.stringify(f.splice(5)), JSON.stringify(f));
const g = [1, 2, 3];
console.log("G", JSON.stringify(g.splice(0, 99)), JSON.stringify(g));
})();
//  ---- 并自 132-splice-negative.ts ----
(function () {
const a: any = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.splice(-2, 1)));
console.log(JSON.stringify(a));
const b: any = [1, 2, 3];
console.log(JSON.stringify(b.splice(1)));
console.log(JSON.stringify(b));
})();
//  ---- 并自 001-array-push-pop.ts ----
(function () {
const xs = [1, 2];
console.log(xs.push(3, 4), xs.join(","));
console.log(xs.pop(), xs.join(","), [].pop());
})();
//  ---- 并自 002-array-shift-unshift.ts ----
(function () {
const xs = [2, 3];
console.log(xs.shift(), xs.join(","));
console.log(xs.unshift(0, 1), xs.join(","));
console.log([].shift());
})();
//  ---- 并自 135-slice-negative.ts ----
(function () {
const a: any = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.slice(-2)), JSON.stringify(a.slice(1, -1)), JSON.stringify(a.slice(3, 1)));
console.log("abcde".slice(-2), "abcde".slice(1, -1), "abcde".slice(3, 1));
})();
