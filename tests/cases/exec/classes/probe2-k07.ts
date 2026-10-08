// xl:title (function () { class A { get x() { return 1; } set x(v) { this._x = v; } } const a = new A(); a.x = 9; return a.x + "," + a._x; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { get x() { return 1; } set x(v) { this._x = v; } } const a = new A(); a.x = 9; return a.x + "," + a._x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
