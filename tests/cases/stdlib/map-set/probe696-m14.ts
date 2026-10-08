// xl:title (function () { const m = new Map(); m.set(1, "a"); m.clear(); return m.size; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map(); m.set(1, "a"); m.clear(); return m.size; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
