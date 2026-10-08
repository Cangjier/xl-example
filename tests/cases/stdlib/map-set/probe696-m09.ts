// xl:title (function () { const s = new Set([1, 2]); let out = ""; s.forEach((v, k) => { out += String(v === k); }); return out; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = new Set([1, 2]); let out = ""; s.forEach((v, k) => { out += String(v === k); }); return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
