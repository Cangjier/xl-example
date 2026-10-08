// xl:title (function () { const s = new Set([1, 2]); s.delete(1); s.add(1); return [...s].join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = new Set([1, 2]); s.delete(1); s.add(1); return [...s].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
