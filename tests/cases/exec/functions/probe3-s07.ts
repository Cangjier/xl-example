// xl:title (function () { const o = { n: 1, f() { const g = () => this.n; return g(); } }; return o.f(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { n: 1, f() { const g = () => this.n; return g(); } }; return o.f(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
