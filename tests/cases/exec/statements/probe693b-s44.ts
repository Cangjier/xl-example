// xl:title (function () { let s = "a"; s += "b"; s += 1; return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = "a"; s += "b"; s += 1; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
