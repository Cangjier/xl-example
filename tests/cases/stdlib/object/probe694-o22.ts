// xl:title (function () { const a = [1, 2]; return a.hasOwnProperty(0) + "," + a.hasOwnProperty(2); })()
// xl:round 694
// xl:judge stdout
// xl:want differ
// xl:why `[1, 2].hasOwnProperty(0)` 本仓给**假**（JS 给真）：下标是数组的**自有属性**（`getOwnPropertyDescriptor(a, 0)` 在 JS 里给一个数据描述符），而这一支只查属性表。与 `probe694-o19` / `probe694-o27` **同一条根**（第 692 轮收掉的是**字符串**那一半，数组这一半还在）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2]; return a.hasOwnProperty(0) + "," + a.hasOwnProperty(2); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
