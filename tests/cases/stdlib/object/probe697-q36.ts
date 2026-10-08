// xl:title (function () { class A { set v(x) { this._v = x; } } const a = new A(); a.v = 3; return a._v; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { set v(x) { this._v = x; } } const a = new A(); a.v = 3; return a._v; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
