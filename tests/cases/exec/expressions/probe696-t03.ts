// xl:title (function () { function tag(s, ...v) { return v.length; } return tag`${1}${2}`; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function tag(s, ...v) { return v.length; } return tag`${1}${2}`; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
