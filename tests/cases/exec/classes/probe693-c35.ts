// xl:title (function () { const [a = 1, b = 2] = [undefined]; return a + b; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const [a = 1, b = 2] = [undefined]; return a + b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
