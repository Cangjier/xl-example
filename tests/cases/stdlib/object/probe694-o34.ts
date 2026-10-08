// xl:title (function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, enumerable: true }); return JSON.stringify(o); })()
// xl:round 694
// xl:judge stdout
// xl:want differ
// xl:why `JSON.stringify({ get a() { return 1; } })` 本仓给 `{}`（JS 给 `{"a":1}`）：`JsonText` 那一趟**遇到访问器一律跳过**——`Object.values` / `entries` 第 655 轮已经会**现读**（用同一条 `GetProperty` + `call` 通道），`JsonText` 这一趟还没有接上（旁边那四处 `PropertyKind.Accessor → continue`）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, enumerable: true }); return JSON.stringify(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
