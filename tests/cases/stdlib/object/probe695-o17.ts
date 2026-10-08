// xl:title (function () { const t = {}; Object.defineProperty(t, "a", { set(v) { this.b = v; }, enumerable: true }); t.a = 3; return t.b + "," + Object.keys(t).join(","); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const t = {}; Object.defineProperty(t, "a", { set(v) { this.b = v; }, enumerable: true }); t.a = 3; return t.b + "," + Object.keys(t).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
