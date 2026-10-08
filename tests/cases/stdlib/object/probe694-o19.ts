// xl:title (function () { const a = [1, 2]; Object.defineProperty(a, 0, { value: 9 }); return a.join(","); })()
// xl:round 694
// xl:judge stdout
// xl:want differ
// xl:why `Object.defineProperty([1, 2], 0, { value: 9 })` 本仓**响亮地抛**（JS 给 `9,2`）：数组的下标住在**元素载荷**里、不在属性表里，而 `defineProperty` 那一条只看属性表。与 `probe694-o22` / `probe694-o27` **同一条根**——「数组的下标也是自有属性」这件事这一层还没有格子。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2]; Object.defineProperty(a, 0, { value: 9 }); return a.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
