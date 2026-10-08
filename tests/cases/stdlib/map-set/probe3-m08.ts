// xl:title (function () { const s = new Set([1]); const out = []; s.forEach((v, v2, ss) => out.push(v === v2, ss === s)); return out.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = new Set([1]); const out = []; s.forEach((v, v2, ss) => out.push(v === v2, ss === s)); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
