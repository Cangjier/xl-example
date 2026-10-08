// xl:title Object.assign([], [1, 2]).length
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why **数组的下标不是自有属性**那一族：`Object.assign([], [1, 2]).length` 在 JS 里是 `2`，本仓是 `0`（**静默错值**）。数组的元素住在 `Elements` 载荷里、不在 `Props` 里，而 `Object.assign` 往目标写 `"0"` / `"1"` 时只看属性表。与 `probe694-o19` / `probe694-o22` / `probe694-o27` / `probe698-c09` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.assign([], [1, 2]).length));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
