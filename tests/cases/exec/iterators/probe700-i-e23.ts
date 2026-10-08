// xl:title (function () { const { a, ...r } = { a: 1, b: 2 }; return a + ':' + Object.keys(r).join(); })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const { a, ...r } = { a: 1, b: 2 }; return a + ':' + Object.keys(r).join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
