// xl:title String 的方法：pad / slice 与 substring / trim 家族 / split / replace 与 $& / String.raw / 码点
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 8 条探针
// （`p707a-s01` … `p707a-s08`）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

(() => {
  console.log(show("5".padStart(3, "0")) + "," + show("5".padEnd(3, "0")) + "," + show("abc".padStart(2, "0")));
})();
(() => {
  console.log(show("abcdef".slice(-3)) + "," + show("abcdef".substring(-3)) + "," + show("abcdef".slice(1, -1)));
})();
(() => {
  console.log(show(JSON.stringify("  a  ".trim())) + "," + show(JSON.stringify("  a  ".trimStart())) + "," + show(JSON.stringify("  a  ".trimEnd())));
})();
(() => {
  console.log(show(JSON.stringify("a,b,c".split(",", 2))) + "," + show(JSON.stringify("abc".split(""))) + "," + show(JSON.stringify("".split(","))));
})();
(() => {
  console.log(show("abc".replace("b", "[$&]")) + "," + show("abc".replace("b", "$" + String.fromCharCode(96))) + "," + show("abc".replace("b", "$'")));
})();
(() => {
  console.log(show(String.raw`a\nb`) + "," + show(String.raw({ raw: ["a", "b"] }, 1)));
})();
(() => {
  console.log(show(String.fromCharCode(65, 66)) + "," + show(String.fromCodePoint(128512).length) + "," + show(String.fromCodePoint(65)));
})();
(() => {
  console.log(show("A".charCodeAt(0)) + "," + show("A".codePointAt(0)) + "," + show(String.fromCodePoint(128512).codePointAt(0)));
})();
