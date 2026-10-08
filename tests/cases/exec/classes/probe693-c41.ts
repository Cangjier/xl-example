// xl:title (function () { const o = {}; const k = "a"; o[k] = 1; return o.a; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; const k = "a"; o[k] = 1; return o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
