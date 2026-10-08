// xl:title (function () { return (function () { return this === undefined ? "u" : typeof this; })(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return (function () { return this === undefined ? "u" : typeof this; })(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
