// xl:title 其余边角：`repeat` 的边界、`localeCompare` 的一般档、空串那一格
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/string 里逐条一问的 6 条探针
// （p-str-localecompare · p-str-repeat-edge · probe699-s-e48·49 · probe703-s-e30 · probe704-s-e22）。
// **第 812 轮又并进 1 条**（来源下盘）：204-a-localecompare-a（`"a".localeCompare("a")` 给 0）。
// 判定点只有一个：**`repeat` 的边界与 `localeCompare` 的等 / 大 / 小三档**——
//  `repeat(0)` 给空串、负数抛 `RangeError`；`localeCompare` 相等给 0、`"a"` 对 `"b"` 给负数。
// （区域设置那一档不在本条，那是 `144-localecompare-differ` 的账。）
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

// ===== 第 812 轮并入：1 条同判定点来源（正文逐字照搬） =====

// ---- 并自 204-a-localecompare-a.ts ----
(() => {
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · stdlib/string/probe695-y16.ts
//   · stdlib/string/probe704-s-e21.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("a".localeCompare("a")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();
