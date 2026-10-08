// xl:title (function () { class A { set v(x) { this._x = x; } get v() { return this._x; } } const a = new A(); a.v = 5; return a.v; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { set v(x) { this._x = x; } get v() { return this._x; } } const a = new A(); a.v = 5; return a.v; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
