// xl:title (function () { const [a, ...r] = [1, 2, 3]; return r.length; })()
// xl:round 705
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const [a, ...r] = [1, 2, 3]; return r.length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
