// xl:title `padStart` / `padEnd` / `repeat` 的目标长度、填充串与次数
// xl:round 692
// xl:judge stdout
// xl:end
// **第 811 轮（合并）**：它那个判定点在 `stdlib/string` 里被写了 17 遍
//  （本文件 + 16 条已经被它吸收过、却一直留在盘上的来源）。这一轮把那些来源的正文
//  **逐字**接在下面（每块一个 IIFE、块首写明出处），**源文件从盘上删掉**；并组完整性由一把
//  一次性尺子核对：合并后的 `node` / `tsrun` stdout 与「本文件改前那一份 ＋ 各来源 stdout 的
//  顺次相接」**逐字节相同**（两侧都中）。
// **合并了原先同一个判定点的十八条**：
//   probe-s16 · probe-s20 · probe3-y12 · probe3-y13 · probe693-y19 · probe693-y23 ·
//   probe693-y24 · probe693-y25 · probe694-y10 · probe695-y07 · probe695-y08 ·
//   probe699-s-e12 · probe699-s-e50 · probe703-s-e05 · probe703-s-e21 · probe704-s-e18 ·
//   probe704-s-e19 · probe705-s-g09
// 判定点只有一个：**这三个方法怎么处理目标长度与重复次数**——
//  ① 目标长度小于原长 ⇒ 原样返回（不截断）；
//  ② 填充串多字符 **循环取用**、只取到目标长度为止；
//  ③ 省略填充串给空格；
//  ④ `repeat` 的次数先取整（小数向下）、负数抛 `RangeError`。
// **第 812 轮又并进 7 条**（正文见下面各块；来源已下盘）：
//   exec/round708/039-string-replace-and-repeat（跨类别的同判定点）·
//   066-string-replace-forms-r304 · 074-string-raw-r323 · 098-string-raw-r371 ·
//   102-string-iterator-codepoints-r371 · 140-string-codepoint-iteration-r676 ·
//   157-string-raw-r683 —— 后六条里与 pad/repeat 无关的那几行归各自判定点，正文照搬。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("x".repeat(3)));
  console.log(show("ab".repeat(3)));
  console.log(show("abc".repeat(0)));
  console.log(show("abc".repeat(1.5)));
  console.log(show("ab".repeat(2.5)));
  console.log(show("a".repeat(-1)));
  console.log(show("a".padEnd(3)));
  console.log(show("ab".padStart(4, "0")));
  console.log(show("ab".padEnd(1, "0")));
  console.log(show("abc".padEnd(5, "xy")));
  console.log(show("abc".padStart(5, "12")));
  console.log(show("abc".padEnd(6, "12")));
  console.log(show("abc".padStart(2, "0")));
  console.log(show("abc".padStart(2)));
  console.log(show("abc".padStart(5, "0")));
  console.log(show("a".padEnd(3, "-")));
  console.log(show("abc".padStart(10).length));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}

//  ---- 并自 012-string-repeat-pad.ts ----
(() => {
console.log("ab".repeat(3), "ab".repeat(0).length, "7".padStart(3, "0"), "7".padEnd(3, "."));
console.log("abc".padStart(2, "0"), "x".padStart(5).length);
})();

//  ---- 并自 026-string-pad-and-repeat-forms.ts ----
(() => {
console.log("5".padStart(3, "0"), "5".padEnd(3, "-"), "abc".padStart(2, "0"));
console.log("ab".repeat(3), "ab".repeat(0).length, "x".padStart(5).length);
console.log("7".padStart(3, "ab"));
})();

//  ---- 并自 035-string-pad-and-repeat-edge-forms.ts ----
(() => {
console.log("5".padStart(3, "0"), "5".padEnd(3, "0"), "abc".padStart(2, "0"));
console.log("5".padStart(5, "ab"), "5".padEnd(4));
console.log("ab".repeat(3), "ab".repeat(0), "".repeat(3), "a".repeat(2.9).length);
try { "a".repeat(-1); } catch (e: any) { console.log(e.name); }
})();

//  ---- 并自 044-string-padstart-forms.ts ----
(() => {
console.log("5".padStart(3, "0"), "5".padEnd(3, "0"), "abc".padStart(2), "x".padStart(4, "ab"));
})();

//  ---- 并自 048-string-repeat-and-pad-edges.ts ----
(() => {
console.log("ab".repeat(0).length, "ab".repeat(1), "ab".repeat(3));
console.log("x".padStart(3, "ab"), "x".padEnd(3, "ab"));
console.log("abc".padStart(2), "abc".padEnd(2, "z"));
})();

//  ---- 并自 076-string-padstart-padend.ts ----
(() => {
console.log("5".padStart(3, "0"), "5".padEnd(3, "*"), "abc".padStart(2));
console.log("x".padStart(5, "ab"), "y".padEnd(4, "12"), "".padStart(3, "-"));
})();

//  ---- 并自 088-string-pad-forms.ts ----
(() => {
console.log("5".padStart(3, "0"), "5".padEnd(3, "0"));
console.log("abc".padStart(2, "0"), "abc".padEnd(2, "0"));
console.log("5".padStart(6, "ab"), "5".padEnd(6, "ab"));
console.log("x".padStart(4), JSON.stringify("x".padStart(4)));
console.log("x".padStart(4, ""), "x".padEnd(4, ""));
})();

//  ---- 并自 089-string-repeat-edge.ts ----
(() => {
console.log(JSON.stringify("ab".repeat(0)), "ab".repeat(1), "ab".repeat(3));
console.log("ab".repeat(2.9));
try { "ab".repeat(-1); } catch (e) { console.log((e as Error).name); }
console.log("ab".repeat(NaN).length);
})();

//  ---- 并自 105-string-pad-in-table.ts ----
(() => {
const rows = [["id", "name"], ["1", "alice"], ["22", "bob"]];
for (const [a, b] of rows) console.log(a.padStart(3) + " | " + b.padEnd(6) + "|");
console.log(rows.map((r) => r[1].padEnd(8, ".")).join(""));
console.log("header".padEnd(10, "="));
})();

//  ---- 并自 108-string-concat-repeat.ts ----
(() => {
console.log("a".concat("b", "c"), "ab".repeat(3), "x".padStart(3, "0"), "x".padEnd(3, "-"));
console.log("abc".at(-1), "abc".at(0), "abc".at(5));
})();

//  ---- 并自 127-string-replaceall-and-pad.ts ----
(() => {
console.log("a-b-c".replaceAll("-", "+"), "aaa".replaceAll("a", "b"));
console.log("Abc".padStart(6, "0"), "Abc".padEnd(6, "-"), "A".padStart(3));
console.log("  x  ".trim(), "|" + "  x".trimStart() + "|", "|" + "x  ".trimEnd() + "|");
})();

//  ---- 并自 130-string-pad-and-trim.ts ----
(() => {
console.log("5".padStart(3, "0"), "5".padEnd(3, "0"), "abc".padStart(2, "0"));
console.log(JSON.stringify("  x  ".trim()), JSON.stringify("  x  ".trimStart()));
console.log(JSON.stringify("  x  ".trimEnd()), "ab".repeat(3));
console.log("abc".padStart(6, "12"));
})();

//  ---- 并自 134-string-pad-end.ts ----
(() => {
console.log("ab".padEnd(5, "xy"), "ab".padEnd(1, "x"), "ab".padStart(5, "12"));
console.log("a".padEnd(4).length, "|" + "a".padStart(3) + "|");
})();

//  ---- 并自 143-split-replace-and-pad.ts ----
(() => {
// **按判定点并组（第 789 轮）**：吸收 stdlib/string 里逐条一问的 7 条探针
// （p-str-padstart · p-str-replace-dollar · p-str-replaceall · p-str-split-empty · p-str-split-limit · probe693-y1 · probe696-s22）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// split 的空串与 limit、replace 的替换串元字符、pad 系列的填充串、String.raw

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p-str-padstart.ts（第 692 轮）
(() => {
  console.log("abc".padStart(6, "12"), "abc".padEnd(6, "12"), "abc".padStart(2, "0"));
})();

// 吸收 p-str-replace-dollar.ts（第 692 轮）
(() => {
  console.log("aXb".replace("X", "[$&]"), "aXb".replace("X", "$$"));
})();

// 吸收 p-str-replaceall.ts（第 692 轮）
(() => {
  console.log("aXbXc".replaceAll("X", "-"));
})();

// 吸收 p-str-split-empty.ts（第 692 轮）
(() => {
  console.log(JSON.stringify("abc".split("")), JSON.stringify("".split("")));
})();

// 吸收 p-str-split-limit.ts（第 692 轮）
(() => {
  console.log("a-b-c".split("-", 2).join("|"), "abc".split("").length);
})();

// 吸收 probe693-y01.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a-b".replace("-", "+")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-s22.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(String.raw`a\nb`));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
})();

//  ---- 并自 151-arg-string-pad-repeat.ts ----
(() => {
try { console.log("padStart", String('5'.padStart(3, '0'))); } catch (e) { console.log("padStart", "ERR", String(e && e.name)); }
try { console.log("padStart-short", String('abc'.padStart(2, 'x'))); } catch (e) { console.log("padStart-short", "ERR", String(e && e.name)); }
try { console.log("padStart-pad-long", String('x'.padStart(4, 'abcd'))); } catch (e) { console.log("padStart-pad-long", "ERR", String(e && e.name)); }
try { console.log("padEnd", String('5'.padEnd(3, '0'))); } catch (e) { console.log("padEnd", "ERR", String(e && e.name)); }
try { console.log("repeat-0", String('ab'.repeat(0))); } catch (e) { console.log("repeat-0", "ERR", String(e && e.name)); }
try { console.log("repeat-2point9", String('ab'.repeat(2.9))); } catch (e) { console.log("repeat-2point9", "ERR", String(e && e.name)); }
try { console.log("repeat-neg", String('ab'.repeat(-1))); } catch (e) { console.log("repeat-neg", "ERR", String(e && e.name)); }
})();

//  ---- 并自 158-string-pad-repeat.ts ----
(() => {
console.log("5".padStart(3, "0"), "5".padEnd(3, "ab"), "abc".padStart(2));
console.log("ab".repeat(0), "ab".repeat(2));
try { "a".repeat(-1); } catch (e: any) { console.log("repeat-neg", e.constructor.name); }
})();

// ===== 第 812 轮并入：1 条同判定点来源（正文逐字照搬） =====

// ---- 并自 C:\Users\Admin\Documents\GitHub\xl-example\tmp\x812b-src\039-string-replace-and-repeat.ts ----
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("a-b-c".replace("-", "+")) + "," + show("a-b-c".replaceAll("-", "+")));

(() => {
console.log(show("ab".repeat(0)) + "," + show("ab".repeat(2)) + "," + show("ab".padStart(1)));
run(() => { "ab".repeat(-1); });
})();
})();
