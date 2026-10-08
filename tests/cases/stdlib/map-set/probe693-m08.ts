// xl:title (function () { const m = new Map(); const f = (v, k) => { m.set(k, v); }; m.set("a", 1); return m.size; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map(); const f = (v, k) => { m.set(k, v); }; m.set("a", 1); return m.size; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
