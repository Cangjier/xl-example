// xl:title (function () { let s = ""; lbl: while (true) { s += "a"; break lbl; } s += "b"; return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; lbl: while (true) { s += "a"; break lbl; } s += "b"; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
