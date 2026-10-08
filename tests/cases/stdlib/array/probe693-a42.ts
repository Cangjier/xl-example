// xl:title (function () { const a = [1, 2, 3]; return a.splice(1, 1).join(",") + "|" + a.join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2, 3]; return a.splice(1, 1).join(",") + "|" + a.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
