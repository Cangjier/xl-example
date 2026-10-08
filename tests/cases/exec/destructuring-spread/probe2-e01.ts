// xl:title (function () { const [a, ...r] = [1, 2, 3]; return a + "|" + r.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const [a, ...r] = [1, 2, 3]; return a + "|" + r.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
