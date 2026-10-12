// xl:title 运行期造函数那一族：Function 构造 / eval 全局名
// xl:round 789
// xl:judge stdout
// xl:want differ
// xl:why probe-f18：`eval` 这个全局名**没有那一格**（宿主能力表里没有它）⇒ `typeof eval` 给 `"undefined"`，Node 给 `"function"`。eval 是**待做项**（用户口径：要评估），现在只是没装、不是另一种口径。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/functions 里逐条一问的 1 条探针
// （probe-f18）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// eval 这个全局名还没有那一格（本仓报 undefined、Node 给 "function"）——如实登记

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe-f18.ts（第 692 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof eval));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
