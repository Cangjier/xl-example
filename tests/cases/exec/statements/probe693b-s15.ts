// xl:title (function () { let s = ""; switch ("1") { case 1: s += "num"; break; default: s += "other"; } return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; switch ("1") { case 1: s += "num"; break; default: s += "other"; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
