// xl:title (function () { if (true) { function h() { return 3; } } return typeof h; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { if (true) { function h() { return 3; } } return typeof h; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
