// xl:title (function () { const o = { f() { return { g() { return 3; } }; } }; return o.f().g(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { f() { return { g() { return 3; } }; } }; return o.f().g(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
