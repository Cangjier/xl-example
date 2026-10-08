// xl:title (function (a, ...r) { return r.length; })(1, 2, 3)
// xl:round 705
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function (a, ...r) { return r.length; })(1, 2, 3)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
