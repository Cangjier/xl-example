// xl:title `indexOf` / `lastIndexOf` / `includes` 的起始位置
// xl:round 691
// xl:judge stdout
// xl:end
// **第 812 轮并组**：这一条是 `162-string-indexof-from`，把同判定点的一条吸进来、来源下盘：
//   141-r676-std-string-includes-fromindex（`String.includes` 的 `fromIndex`：负数与越界）
// 判定点只有一个：**「从哪里开始找」这一格**——`indexOf` / `lastIndexOf` 的 `fromIndex`、
//  空模式在越界位置上的落位、`startsWith` / `endsWith` 的位置实参、`includes` 的负数与越界。
// **第 812 轮（二）再并进 1 条**（同判定点的跨类重复；来源已下盘）：
//   exec/round708/045-string-includes-starts-with-ends-with（三个方法各自的位次实参）。
const s = "ababab";
console.log(s.indexOf("ab", 1), s.lastIndexOf("ab", 3), s.indexOf("", 99));
console.log("abc".startsWith("b", 1), "abc".endsWith("b", 2));
console.log("abc".includes("", 9));

// ===== 第 812 轮并入：1 条同判定点来源（正文逐字照搬） =====

// ---- 并自 141-r676-std-string-includes-fromindex.ts ----
(() => {
const s = "banana";
console.log(s.includes("nan", 3), s.includes("nan", 2), s.includes("nan", 4));
console.log(s.includes("ban", -3), s.includes("ana", 99));
})();

// ===== 第 812 轮并入：1 条同判定点来源（正文逐字照搬） =====

// ---- 并自 C:\Users\Admin\Documents\GitHub\xl-example\tmp\x812b-src\045-string-includes-starts-with-ends-with.ts ----
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("abc".includes("b", 2)) + "," + show("abc".startsWith("b", 1)) + "," + show("abc".endsWith("b", 2)));
})();
