// xl:title (function () { class A { m() { return 1; } } const a = new A(); a.__proto__ = null; return typeof a.m; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return 1; } } const a = new A(); a.__proto__ = null; return typeof a.m; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
