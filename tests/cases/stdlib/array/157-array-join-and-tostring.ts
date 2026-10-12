// xl:title `join` / `toString` / `toLocaleString`：洞与空值那一格
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-a02 · probe-a34 · probe693-a44 · probe693-a45 · probe693-a46 · probe693-a56 ·
//   probe694-a27 · probe696-h02 · probe696-h14 · probe696-h16 · probe703-a-b15 ·
//   probe703-a-b16 · probe703-a-b17 · probe704-a-f15 · probe704-a-f16 · probe704-a-f17 ·
//   probe696-h25 · p-arr-join-nullish
//   ＋ `003-array-join` / `018-array-join-nullish` / `074-array-join-holes-and-nullish`
//     / `136-join-null-holes` / `031-array-tolocalestring` / `001-array-tostring`
//     / `140-array-tostring-custom-join` / `145-array-tostring-join-dynamic`
//
// 判定点只有一个：**元素 → 文本那一趟**——
//  ① 分隔串默认逗号，给了就用给的（空串也认）；
//  ② `null` / `undefined` / **洞** 一律给**空串**（三档在文本上分不出来）；
//  ③ `toString` 就是 `join(",")`（现读 `this.join`，改了就跟着改）；
//  ④ 嵌套走每一格自己的 `toString`；`toLocaleString` 走每一格的 `toLocaleString`。
//   `003-array-join` · `018-array-join-nullish` · `031-array-tolocalestring` · `074-array-join-holes-and-nullish` · `136-join-null-holes` · `140-array-tostring-custom-join` · `145-array-tostring-join-dynamic` · `118-arg-array-join-holes`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
// **第 813 轮（合并，下盘）**：下面这些同判定点的来源**这一轮真的从盘上删掉了**
//   （它们早就被上面那张清单点过名，文件却一直留在盘上——同判定点重复、分母被灌水）：
//   `003-array-join` · `018-array-join-nullish` · `031-array-tolocalestring` · `074-array-join-holes-and-nullish` · `136-join-null-holes` · `140-array-tostring-custom-join` · `145-array-tostring-join-dynamic` · `118-arg-array-join-holes`
//   正文逐字接在下面（每块一个 IIFE、块首写明出处）；并组完整性由一把一次性尺子核对：
//   合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的顺次相接」逐字节相同。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const holes: any = [1, , 3];

try {
  console.log(show([1, 2, 3].join()));
  console.log(show([1, 2].join("-")));
  console.log(show([1, 2].join("") + [1, 2].length.toString()));
  console.log(show([null, undefined].join("-")));
  console.log(show(holes.join("-")));
  console.log(show([1, [2, [3]]].join("|")));
  console.log(show([1, 2, 3].toString()));
  console.log(show([[1, 2], [3]].toString()));
  console.log(show([1, 2].toLocaleString()));
  console.log(show(String(new Array(3))));
  console.log(show(String([, 1])));
  console.log(show(JSON.stringify([, 1])));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
//  ---- 并自 003-array-join.ts ----
(function () {
const xs: any[] = [1, "a", null, undefined, true];
console.log(xs.join(), xs.join("-"), xs.join(""));
console.log([].join(","), [1].join(","), [1, [2, 3]].join("|"));
})();
//  ---- 并自 018-array-join-nullish.ts ----
(function () {
const xs: any[] = [1, null, undefined, "a", , 2];
console.log(xs.join("-"), xs.join(""), [].join("-"), [undefined].join("-"));
console.log([1, 2].join(), [1, 2].toString());
})();
//  ---- 并自 031-array-tolocalestring.ts ----
(function () {
console.log([1, 2, 3].toLocaleString(), [].toLocaleString(), [1, [2, 3]].toLocaleString());
})();
//  ---- 并自 074-array-join-holes-and-nullish.ts ----
(function () {
const xs: any[] = [1, , 3, undefined, null];
console.log(JSON.stringify(xs.join()));
console.log(JSON.stringify(xs.join("-")));
console.log(JSON.stringify(xs.toString()));
console.log(JSON.stringify([].join("-")), JSON.stringify([1].join()));
})();
//  ---- 并自 136-join-null-holes.ts ----
(function () {
const a: any = [1, , null, undefined, 5];
console.log(a.join("-"));
console.log(a.join());
console.log([1, 2].join(""));
console.log(JSON.stringify([].join("-")));
})();
//  ---- 并自 140-array-tostring-custom-join.ts ----
(function () {
const a: any = [1, 2];
console.log(String(a), a + "");
a.join = function () { return "J"; };
console.log(String(a), a + "");
})();
//  ---- 并自 145-array-tostring-join-dynamic.ts ----
(function () {
const a: any = [1, 2];
console.log(String(a), a + "");
a.join = function () { return "J"; };
console.log(String(a), a + "");
Array.prototype.toString.call({ join: () => "X" } as any);
console.log("ok");
})();
//  ---- 并自 118-arg-array-join-holes.ts ----
(function () {
try { console.log("holes", String([1, , 3].join('-'))); } catch (e) { console.log("holes", "ERR", String(e && e.name)); }
try { console.log("undefnull", String([undefined, null].join('-'))); } catch (e) { console.log("undefnull", "ERR", String(e && e.name)); }
try { console.log("single", String([7].join('-'))); } catch (e) { console.log("single", "ERR", String(e && e.name)); }
try { console.log("empty", String([].join('-'))); } catch (e) { console.log("empty", "ERR", String(e && e.name)); }
try { console.log("tostring-of-holes", String(String([1, , 3]))); } catch (e) { console.log("tostring-of-holes", "ERR", String(e && e.name)); }
})();
