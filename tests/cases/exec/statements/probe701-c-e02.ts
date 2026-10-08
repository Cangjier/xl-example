// xl:title (function () { switch (2) { case 1: case 2: return 'a'; default: return 'b'; } })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { switch (2) { case 1: case 2: return 'a'; default: return 'b'; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
