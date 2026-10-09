// xl:title 其余边角：repeat 的边界、localeCompare 的一般档、空串那一格
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/string 里逐条一问的 6 条探针
// （p-str-localecompare · p-str-repeat-edge · probe699-s-e48·49 · probe703-s-e30 · probe704-s-e22）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// repeat 的负数与小数、localeCompare 的相等 / 大小三档（不含区域设置那一档，那是 144 的账）

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p-str-localecompare.ts（第 692 轮）
(() => {
  console.log("a".localeCompare("b"), "b".localeCompare("a"), "a".localeCompare("a"));
})();

// 吸收 p-str-repeat-edge.ts（第 692 轮）
(() => {
  console.log("ab".repeat(0) === "");
  try {
    "ab".repeat(-1);
    console.log("no-throw");
  } catch (e) {
    console.log(e.constructor.name);
  }
})();

// 吸收 probe699-s-e48.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".localeCompare("abc")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe699-s-e49.ts（第 699 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("b".localeCompare("a")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-s-e30.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".localeCompare("abd") < 0));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-s-e22.ts（第 704 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("b".localeCompare("a") > 0));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
