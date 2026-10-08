// xl:title (function () { const o = { _v: 1, get v() { return this._v; }, set v(x) { this._v = x; } }; o.v = 5; return o.v; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { _v: 1, get v() { return this._v; }, set v(x) { this._v = x; } }; o.v = 5; return o.v; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
