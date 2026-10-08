// xl:title (function () { let s = ""; lbl: try { s += "a"; break lbl; } finally { s += "f"; } s += "b"; return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; lbl: try { s += "a"; break lbl; } finally { s += "f"; } s += "b"; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
