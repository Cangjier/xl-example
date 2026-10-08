// xl:title (function () { const t = {}; Object.defineProperty(t, "a", { get() { return 1; }, set(v) { this.b = v; } }); t.a = 9; return t.b; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const t = {}; Object.defineProperty(t, "a", { get() { return 1; }, set(v) { this.b = v; } }); t.a = 9; return t.b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
