// xl:title (function () { const e = new Error("m"); e.name = "X"; return String(e); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const e = new Error("m"); e.name = "X"; return String(e); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
