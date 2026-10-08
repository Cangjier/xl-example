// xl:title (function () { function tag(s) { return s[0] === undefined; } return tag``; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function tag(s) { return s[0] === undefined; } return tag``; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
