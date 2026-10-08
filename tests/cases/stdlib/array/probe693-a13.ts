// xl:title (function () { const a = [1]; a.length = 3; return a.join(",") + "|" + (1 in a); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1]; a.length = 3; return a.join(",") + "|" + (1 in a); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
