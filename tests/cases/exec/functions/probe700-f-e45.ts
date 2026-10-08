// xl:title (function () { function f(a, b) { return a + b; } return f.bind(null).length; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f(a, b) { return a + b; } return f.bind(null).length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
