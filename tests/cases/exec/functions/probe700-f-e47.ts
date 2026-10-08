// xl:title (function () { return typeof arguments.callee; })()
// xl:round 700
// xl:judge stdout
// xl:want differ
// xl:why `arguments.callee` 取不到（本仓的 `arguments` 是一个数组，没有 `callee` 那一格）。与 `e19` / `t05` 同一条根。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return typeof arguments.callee; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
