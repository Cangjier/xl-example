// xl:title (function () { let i = 0; while (true) { i++; if (i > 2) break; } return i; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let i = 0; while (true) { i++; if (i > 2) break; } return i; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
