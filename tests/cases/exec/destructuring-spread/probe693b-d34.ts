// xl:title (function () { const k = "n"; const o = { [k]: 1 }; return o.n; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const k = "n"; const o = { [k]: 1 }; return o.n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
