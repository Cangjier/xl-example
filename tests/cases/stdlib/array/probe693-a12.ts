// xl:title (function () { const a = [1, 2, 3]; a.length = 1; return a.join(",") + "|" + a.length; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2, 3]; a.length = 1; return a.join(",") + "|" + a.length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
