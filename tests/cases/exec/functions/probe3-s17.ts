// xl:title (function () { const o = {}; o.f = function () { return 1; }; return o.f(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; o.f = function () { return 1; }; return o.f(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
