// xl:title (function () { return typeof Promise.all; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return typeof Promise.all; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
