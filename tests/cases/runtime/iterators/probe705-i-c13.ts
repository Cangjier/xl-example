// xl:title [...{ length: 2 }].length
// xl:round 705
// xl:judge stdout
// xl:want differ
// xl:why 展开一个**不可迭代**的对象（只有 `length`）时 JS 抛 `TypeError`，本仓抛普通 `Error`——`throw:TypeError` 与 `throw:Error` 一字之差。与 `runtime/iterators/probe696-i08` **同一条根**：根子在「不可迭代」那一处的抛出种类，不在数组这一层。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...{ length: 2 }].length));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
