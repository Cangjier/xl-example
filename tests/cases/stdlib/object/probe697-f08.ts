// xl:title (function () { const o = {}; o.b = 1; o.a = 2; o[2] = 3; o[1] = 4; return Object.keys(o).join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; o.b = 1; o.a = 2; o[2] = 3; o[1] = 4; return Object.keys(o).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
