// xl:title (function () { const o = { toString() { return "a"; }, valueOf() { return 1; } }; return String(o); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { toString() { return "a"; }, valueOf() { return 1; } }; return String(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
