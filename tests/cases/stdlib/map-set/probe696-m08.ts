// xl:title (function () { const m = new Map(); m.set("a", 1); m.set("b", 2); let out = ""; m.forEach((v, k) => { out += k + v; }); return out; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map(); m.set("a", 1); m.set("b", 2); let out = ""; m.forEach((v, k) => { out += k + v; }); return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
