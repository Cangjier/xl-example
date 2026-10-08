// xl:title (function (a = b, b = 2) { return a; })()
// xl:round 700
// xl:judge stdout
// xl:want differ
// xl:why 形参默认值里的 **TDZ** 没做：`function (a = b, b = 2) { return a; }()` 在 JS 里抛 `ReferenceError`（`b` 还没初始化），本仓读成 `undefined`。同一根还有 `typeof` 一个还没初始化的 `let`（台账 `runtime/…probe3-s03`）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function (a = b, b = 2) { return a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
