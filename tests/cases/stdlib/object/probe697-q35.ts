// xl:title (function () { const p = { set v(x) { this._v = x; } }; const o = Object.create(p); o.v = 3; return [o._v, Object.getOwnPropertyNames(o).join(",")].join("|"); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = { set v(x) { this._v = x; } }; const o = Object.create(p); o.v = 3; return [o._v, Object.getOwnPropertyNames(o).join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
