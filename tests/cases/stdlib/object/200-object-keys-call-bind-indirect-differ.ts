// xl:title 把 Object.keys.call.bind(Object.keys) 当回调调用：bind 出来的内建函数再被调用时接收者与实参的落法
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why `Object.keys.call.bind(Object.keys)` 这一格（`Function.prototype.call` **被 bind 之后再当回调**）本仓抛 `TypeError`，JS 给 3。与 `probe693-f13` 那族无关，是 `bind` 出来的**内建函数**再被调用时接收者 / 实参的落法。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([1, 2, 3].map(Object.keys.call.bind(Object.keys)).length));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
