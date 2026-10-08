// xl:title (function () { const o = Object.create(null); o.x = 1; return Object.keys(o).join(",") + "|" + (o.toString === undefined); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.create(null); o.x = 1; return Object.keys(o).join(",") + "|" + (o.toString === undefined); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
