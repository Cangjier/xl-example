// xl:title (function f(n) { return n === 0 ? 0 : f(n - 1) + n; })(4)
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function f(n) { return n === 0 ? 0 : f(n - 1) + n; })(4)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
