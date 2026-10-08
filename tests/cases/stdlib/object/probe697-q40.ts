// xl:title (function () { const p = {}; Object.defineProperty(p, "z", { set(x) { this._z = x; }, configurable: true }); const o = Object.create(p); o.z = 9; return o._z; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = {}; Object.defineProperty(p, "z", { set(x) { this._z = x; }, configurable: true }); const o = Object.create(p); o.z = 9; return o._z; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
