// xl:title (function () { let s = ""; lbl: for (const x of [1, 2]) { s += x; break lbl; } s += "z"; return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; lbl: for (const x of [1, 2]) { s += x; break lbl; } s += "z"; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
