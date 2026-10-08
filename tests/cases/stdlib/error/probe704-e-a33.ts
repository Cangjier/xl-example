// xl:title (function () { const e = new Error("m"); e.name = "N"; return e.toString(); })()
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const e = new Error("m"); e.name = "N"; return e.toString(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
