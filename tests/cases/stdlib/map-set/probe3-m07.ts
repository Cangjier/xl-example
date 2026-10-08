// xl:title (function () { const m = new Map([["a", 1]]); const out = []; m.forEach((v, k, mm) => out.push(k + v + (mm === m))); return out.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([["a", 1]]); const out = []; m.forEach((v, k, mm) => out.push(k + v + (mm === m))); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
