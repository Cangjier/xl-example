// xl:title (function () { const o = { length: 2, 0: "a", 1: "b" }; return [...o].length; })()
// xl:round 696
// xl:judge stdout
// xl:want differ
// xl:why 展开一个**不可迭代**的对象（只有 `length` / 下标）时 JS 抛 `TypeError`，本仓抛普通 `Error`——`catch (e) { e instanceof TypeError }` 分不出来。根子在「不可迭代」那一处的抛出种类，不在数组这一层。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { length: 2, 0: "a", 1: "b" }; return [...o].length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
