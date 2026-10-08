// xl:title (function () { class A { m() { return 1; } } const m = new A().m; return typeof m; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return 1; } } const m = new A().m; return typeof m; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
