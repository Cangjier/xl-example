// xl:title (function () { const o = {}; for (const k in { a: 1, b: 2 }) o[k] = 1; return Object.keys(o).join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; for (const k in { a: 1, b: 2 }) o[k] = 1; return Object.keys(o).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
