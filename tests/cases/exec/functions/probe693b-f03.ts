// xl:title (function () { const f = function () { return arguments[1]; }; return f(1, 2); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = function () { return arguments[1]; }; return f(1, 2); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
