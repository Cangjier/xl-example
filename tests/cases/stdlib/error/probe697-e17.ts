// xl:title (function () { try { undefinedFn(); } catch (e) { return e.constructor.name; } })()
// xl:round 697
// xl:judge stdout
// xl:want blocked
// xl:why 调用一个**根本查不到的名字**（`undefinedFn()`）在 JS 里是运行期的 `ReferenceError`，本仓在**降级期**就报 `name is not a local or a capture`（整份文件进不来）。两种口径都不是「静默错值」，差别在「能不能 `try/catch` 住」——JS 里能，本仓不能。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { undefinedFn(); } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
