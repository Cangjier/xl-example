// xl:title (function () { const e = new TypeError("t"); return e.name + "," + (e instanceof TypeError); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const e = new TypeError("t"); return e.name + "," + (e instanceof TypeError); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
