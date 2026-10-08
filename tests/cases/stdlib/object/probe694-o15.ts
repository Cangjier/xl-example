// xl:title (function () { const o = Object.create(null); o.a = 1; return Object.keys(o).length + "," + (o instanceof Object); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.create(null); o.a = 1; return Object.keys(o).length + "," + (o instanceof Object); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
