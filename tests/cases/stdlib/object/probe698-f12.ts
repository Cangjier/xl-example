// xl:title (function () { const o = { set a(v) { this._a = v; } }; o.a = 4; return o._a; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { set a(v) { this._a = v; } }; o.a = 4; return o._a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
