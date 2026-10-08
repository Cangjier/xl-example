// xl:title (function () { const f = new Function("a", "b", "return a + b"); return f(1, 2); })()
// xl:round 693
// xl:judge stdout
// xl:want differ
// xl:why `new Function("a", "b", "return a + b")` 那一档（**运行期造函数**）本仓抛 `Error`（与 `probe693-f22` 同一条根）：`eval` / `Function` 构造这一族整体待做。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = new Function("a", "b", "return a + b"); return f(1, 2); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
