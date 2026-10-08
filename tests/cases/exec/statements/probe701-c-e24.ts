// xl:title (function () { const f = (x) => x * 2; return [1, 2].map(f).join(); })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = (x) => x * 2; return [1, 2].map(f).join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
