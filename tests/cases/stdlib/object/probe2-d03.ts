// xl:title (function () { const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, set(v) { this.y = v; } }); o.x = 5; return o.x + "," + o.y; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, set(v) { this.y = v; } }); o.x = 5; return o.x + "," + o.y; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
