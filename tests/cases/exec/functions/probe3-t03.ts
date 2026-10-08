// xl:title (function () { function f() { return this === undefined ? "u" : typeof this; } return f.call(1); })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 松散模式里 `call` / `apply` / `bind` 的接收者是**原始值**时要先 `ToObject` **装箱**（`typeof this` 给 `object`），本仓把原始值原样交出去。与 `exec/functions/094-bind-apply-primitive` **同一条根**：引擎那一层（`DoCall`）只兜了「`null` / `undefined` ⇒ 全局对象」那一半，装箱那一半要语言层的包装对象（`MakeBox`）——**分层上得先有那条通道**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { return this === undefined ? "u" : typeof this; } return f.call(1); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
