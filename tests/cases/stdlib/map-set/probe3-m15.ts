// xl:title (function () { const s = new Set([3, 1, 2]); return [...s].sort().join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = new Set([3, 1, 2]); return [...s].sort().join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
