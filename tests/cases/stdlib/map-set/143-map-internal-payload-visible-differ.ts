// xl:title Map 的内部载荷是可见的自有属性（账）
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe703-m-d10：**`Map` 的内部载荷是可见的自有属性**：`new Map([[1, 2]])["__k"]` 在 JS 里是 `undefined`，本仓拿得到那个内部表（`Map` / `Set` 在本仓做成「带几格隐藏属性的普通对象」，而**隐藏**只做到「不进 `Object.keys`」这一层）。要做就得让属性**读**那一侧也跳过隐藏格——那是引擎侧的一处改动，牵动面比这一条大，先记在这里。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/map-set 里逐条一问的 1 条探针
// （probe703-m-d10）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// new Map([[1, 2]])["__k"] 在 JS 里是 undefined，本仓读得到内部表——隐藏只做到「不进 Object.keys」这一层

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe703-m-d10.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Map([[1, 2]])["__k"] === undefined));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
