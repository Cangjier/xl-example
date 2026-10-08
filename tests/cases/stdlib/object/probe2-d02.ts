// xl:title (function () { const o = {}; Object.defineProperty(o, "x", { set(v) { this.y = v; } }); o.x = 5; return o.y; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "x", { set(v) { this.y = v; } }); o.x = 5; return o.y; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
