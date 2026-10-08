// xl:title (function () { class A { x = 1; y = this.x + 1; } const a = new A(); return a.y; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { x = 1; y = this.x + 1; } const a = new A(); return a.y; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
