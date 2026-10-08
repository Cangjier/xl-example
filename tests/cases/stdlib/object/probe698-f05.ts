// xl:title (function () { const k = "x"; const o = { [k]: 1, [k]: 2 }; return o.x; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const k = "x"; const o = { [k]: 1, [k]: 2 }; return o.x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
