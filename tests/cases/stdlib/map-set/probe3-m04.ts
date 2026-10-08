// xl:title (function () { const s = new Set([1, 2, 3]); s.delete(2); return [...s].join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = new Set([1, 2, 3]); s.delete(2); return [...s].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
