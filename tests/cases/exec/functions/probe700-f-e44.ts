// xl:title (function () { function f(a) { return a; } const g = f.bind(null, 5); return g(9); })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f(a) { return a; } const g = f.bind(null, 5); return g(9); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
