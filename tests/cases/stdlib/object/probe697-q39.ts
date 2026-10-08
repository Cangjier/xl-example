// xl:title (function () { const proto = { set s(x) { this._s = x; } }; const o = Object.create(proto); o.s = 1; o.s = 2; return o._s; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const proto = { set s(x) { this._s = x; } }; const o = Object.create(proto); o.s = 1; o.s = 2; return o._s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
