// xl:title (function () { const o = {}; o.b = 1; o[0] = 2; o.a = 3; return Object.keys(o).join(""); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; o.b = 1; o[0] = 2; o.a = 3; return Object.keys(o).join(""); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
