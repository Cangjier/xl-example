// xl:title (function () { const o = {}; let n = 0; Object.defineProperty(o, "x", { get() { n = n + 1; return 1; } }); Object.keys(o); return n; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; let n = 0; Object.defineProperty(o, "x", { get() { n = n + 1; return 1; } }); Object.keys(o); return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
