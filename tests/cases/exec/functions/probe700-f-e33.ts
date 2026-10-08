// xl:title (function () { const o = { v: 1, m() { return this.v; } }; const m = o.m; return typeof m(); })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { v: 1, m() { return this.v; } }; const m = o.m; return typeof m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
