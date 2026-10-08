// xl:title (function () { const o = {}; o[1.5] = 1; o[2] = 2; return Object.keys(o).join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; o[1.5] = 1; o[2] = 2; return Object.keys(o).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
