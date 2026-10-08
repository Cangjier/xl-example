// xl:title (function () { return typeof this; }).call(1)
// xl:round 700
// xl:judge stdout
// xl:want differ
// xl:why 松散模式里 `call` / `apply` 的**原始值接收者要装箱**（JS：`(function () { return typeof this; }).call(1)` 给 `"object"`），本仓原样递进去 ⇒ 给 `"number"`。与 `exec/functions/094-bind-apply-primitive` / `probe3-t03` / `probe3-t04` / `probe3-t14` **同一条根**（`ToObject` 那一档还没接进调用路径）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return typeof this; }).call(1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
