// xl:title (function () { const o = { valueOf() { return 1; }, toString() { return "2"; } }; return o + 1; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { valueOf() { return 1; }, toString() { return "2"; } }; return o + 1; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
