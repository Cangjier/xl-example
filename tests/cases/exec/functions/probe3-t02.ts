// xl:title (function () { const o = { v: 1, m() { return this.v; } }; return o.m(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { v: 1, m() { return this.v; } }; return o.m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
