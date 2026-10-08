// xl:title (function () { return Object.assign([], [1, 2]).length; })()
// xl:round 694
// xl:judge stdout
// xl:want differ
// xl:why `Object.assign([], [1, 2])` 本仓给一个**长度 0** 的数组（JS 给长度 2）：来源那一半按下标抄（第 598 轮就对了），可**往数组目标写 `"0"` / `"1"`** 这一步落在属性表上，而下标在**元素载荷**里 ⇒ 整片静默丢掉（**静默错值**）。与 `probe694-o19` / `probe694-o22` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return Object.assign([], [1, 2]).length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
