// xl:title (function (a) { return this === undefined ? "u" : typeof this; }).call(1)
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why **松散模式里原始值 `this` 要装箱**：`(function () { return typeof this; }).call(1)` 在 JS 里给 `"object"`（`this` 是 `Number` 包装对象），本仓给 `"number"`——**静默错值**。`DoCallValue` 那一格把接收者原样交进去，没有 `ToObject` 那一步（`null` / `undefined` 换成全局对象那一半是对的）。与 `p703f-g12` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function (a) { return this === undefined ? "u" : typeof this; }).call(1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
