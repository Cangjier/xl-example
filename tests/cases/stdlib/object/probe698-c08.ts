// xl:title (function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, set(v) { this._v = v; }, enumerable: true }); o.a = 9; return [o.a, o._v, Object.keys(o).join(",")].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, set(v) { this._v = v; }, enumerable: true }); o.a = 9; return [o.a, o._v, Object.keys(o).join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
