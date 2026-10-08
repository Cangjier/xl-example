// xl:title (function () { let i = 0; do { i++; } while (i < 3); return i; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let i = 0; do { i++; } while (i < 3); return i; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
