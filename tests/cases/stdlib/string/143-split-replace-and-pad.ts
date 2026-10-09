// xl:title 切分 / 替换 / 填充：split 与 limit、replace 的 $&、padStart 与 padEnd
// xl:round 789
// xl:judge stdout
// xl:end
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
