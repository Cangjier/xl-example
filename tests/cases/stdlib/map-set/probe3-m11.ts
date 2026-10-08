// xl:title (function () { const s = new Set([1, 2]); return s.has(2) + "," + s.has("2"); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = new Set([1, 2]); return s.has(2) + "," + s.has("2"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
