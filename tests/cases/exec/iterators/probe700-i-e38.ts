// xl:title (function () { const a = [1, 2, 3]; return [...a, ...a].length; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2, 3]; return [...a, ...a].length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
