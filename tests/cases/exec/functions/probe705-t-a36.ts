// xl:title Function.prototype.toString.call(Math.floor)
// xl:round 705
// xl:judge stdout
// xl:want differ
// xl:why `Function.prototype.toString.call(Math.floor)` 在 JS 里给 `function floor() { [native code] }`（`Math.floor` 是**内建函数**、`toString` 按规范给 `[native code]`），本仓抛 `TypeError`——`Function.prototype.toString` 借 `.call` 调、接收者又是一个内建那一档。与 `stdlib/object/probe693-o46`（`Object.keys.call.bind(Object.keys)` 那一格）**同一族**：`bind` / `call` 出来的内建函数再被调用时接收者与实参的落法。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Function.prototype.toString.call(Math.floor)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
