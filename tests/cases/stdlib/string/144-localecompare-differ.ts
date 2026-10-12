// xl:title localeCompare 是区域设置那一族（账）
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe693-y29：`localeCompare` 是**区域设置**那一族的（JS 走 ICU 的排序表，`"aBc".localeCompare("abc")` 在 Node 里给正数），本仓按码元逐位比 ⇒ 给负数。整个 `Intl` 族都还没有。要做。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/string 里逐条一问的 1 条探针
// （probe693-y29）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// JS 走 ICU 的排序表（"aBc".localeCompare("abc") 给正数），本仓按码元逐位比——整个 Intl 族都还没有

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe693-y29.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("aBc".localeCompare("abc") < 0));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
