// xl:title (function () { const o = { f() { return 1; } }; const g = o.f.bind(o); return g(); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { f() { return 1; } }; const g = o.f.bind(o); return g(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
