// xl:title (function () { const f = (a, ...r) => a + r.length; return f(1, 2, 3); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = (a, ...r) => a + r.length; return f(1, 2, 3); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
