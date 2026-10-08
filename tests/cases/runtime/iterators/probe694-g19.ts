// xl:title (function () { const o = {}; return typeof o[Symbol.iterator]; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; return typeof o[Symbol.iterator]; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
