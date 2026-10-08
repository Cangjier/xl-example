// xl:title (function () { const m = new Map([["a", 1]]); const it = m[Symbol.iterator](); const e = it.next().value; return e[0] + e[1]; })()
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why `Map.prototype[Symbol.iterator]()` 交回来的**条目数组**（`[键, 值]`）本仓按下标读会抛 `TypeError`（JS 给 `"a"`）：迭代器那一条路交出来的东西还不是「按位置读的数组」。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([["a", 1]]); const it = m[Symbol.iterator](); const e = it.next().value; return e[0] + e[1]; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
