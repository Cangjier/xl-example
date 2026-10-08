// xl:title (function () { function f(a, b) { return a + b; } return f.apply(null, [1, 2]); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f(a, b) { return a + b; } return f.apply(null, [1, 2]); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
