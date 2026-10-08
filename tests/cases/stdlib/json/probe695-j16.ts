// xl:title (function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, enumerable: true }); return JSON.stringify(o, null, 2); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, enumerable: true }); return JSON.stringify(o, null, 2); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
