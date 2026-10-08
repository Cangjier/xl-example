// xl:title (function () { const p = {}; Object.defineProperty(p, "x", { get() { return this.tag; } }); const c = Object.create(p); c.tag = "t"; return c.x; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = {}; Object.defineProperty(p, "x", { get() { return this.tag; } }); const c = Object.create(p); c.tag = "t"; return c.x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
