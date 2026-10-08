// xl:title (function () { return this; }).bind(1)() === 1
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why 同 `p703f-g11`：`(function () { return this; }).bind(1)() === 1` 在 JS 里是 **`false`**（bind 记下的接收者在被调用时要 `ToObject`），本仓给 `true`。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return this; }).bind(1)() === 1));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
