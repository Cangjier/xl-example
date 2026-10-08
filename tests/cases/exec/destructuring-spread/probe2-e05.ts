// xl:title (function () { const k = "x"; const { [k]: v } = { x: 1 }; return v; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const k = "x"; const { [k]: v } = { x: 1 }; return v; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
