// xl:title (function () { const o = { valueOf: () => 1, toString: () => "t" }; return String(o); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { valueOf: () => 1, toString: () => "t" }; return String(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
