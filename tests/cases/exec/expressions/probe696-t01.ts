// xl:title (function () { return (function (s) { return s.raw[0]; })`a\nb`; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return (function (s) { return s.raw[0]; })`a\nb`; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
