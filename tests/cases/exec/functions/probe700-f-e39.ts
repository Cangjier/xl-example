// xl:title (function () { return (0, function () { return this === undefined ? 'u' : typeof this; })(); })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return (0, function () { return this === undefined ? 'u' : typeof this; })(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
