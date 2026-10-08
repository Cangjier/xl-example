// xl:title (function () { switch (2) { case 1: return "one"; default: return "other"; case 2: return "two"; } })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { switch (2) { case 1: return "one"; default: return "other"; case 2: return "two"; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
