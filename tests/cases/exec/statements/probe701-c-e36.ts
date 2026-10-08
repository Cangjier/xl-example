// xl:title (function () { switch (1) { default: return 'd'; case 1: return 'one'; } })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { switch (1) { default: return 'd'; case 1: return 'one'; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
