// xl:title (function () { function f(a = 1, b = 2) { return a + b; } return f(undefined, 3); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f(a = 1, b = 2) { return a + b; } return f(undefined, 3); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
