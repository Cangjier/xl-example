// xl:title (function () { const a = []; a[-1] = 1; return a.length + "," + a[-1]; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = []; a[-1] = 1; return a.length + "," + a[-1]; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
