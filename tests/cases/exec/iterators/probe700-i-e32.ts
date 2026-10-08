// xl:title (function () { const s = new Set([1, 2, 3]); let t = 0; s.forEach(v => t += v); return t; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = new Set([1, 2, 3]); let t = 0; s.forEach(v => t += v); return t; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
