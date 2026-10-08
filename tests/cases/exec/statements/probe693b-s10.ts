// xl:title (function () { let n = 0; let i = 0; do { i++; n += i; } while (i < 3); return n; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; let i = 0; do { i++; n += i; } while (i < 3); return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
