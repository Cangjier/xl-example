// xl:title typeof Error.captureStackTrace
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why `Error` 的静态成员（`captureStackTrace` / `prepareStackTrace` / `stackTraceLimit`）没有格子 ⇒ 取到 `undefined`，Node 上是 `function` / `number`。与 `stdlib/error/031-names-error` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof Error.captureStackTrace));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
