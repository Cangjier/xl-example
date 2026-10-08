// xl:title (function () { const [a, b = 2] = [1]; return a + b; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const [a, b = 2] = [1]; return a + b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
