// xl:title (function () { return typeof [][Symbol.iterator]().next; })()
// xl:round 694
// xl:judge stdout
// xl:want differ
// xl:why `[][Symbol.iterator]()` 交回来的**迭代器对象**在 JS 上有 `next` / `return` / `throw` 三个方法（`typeof it.next` 给 `"function"`），本仓把那个对象做成了**普通数组** ⇒ 取 `next` 得 `undefined`、调用抛 `TypeError`。与 `probe693b-g15`（`Map` 迭代器条目按下标读）**同一族**：迭代器对象还没有自己的形状。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return typeof [][Symbol.iterator]().next; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
