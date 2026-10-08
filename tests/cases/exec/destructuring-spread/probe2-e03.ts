// xl:title (function () { const { a = 1, b: { c = 2 } = {} } = {}; return a + "," + c; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const { a = 1, b: { c = 2 } = {} } = {}; return a + "," + c; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
