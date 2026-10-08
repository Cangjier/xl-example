// xl:title (function () { return (function (s, v) { return s.length + ":" + v; })`x${1}y`; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return (function (s, v) { return s.length + ":" + v; })`x${1}y`; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
