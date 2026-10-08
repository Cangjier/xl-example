// xl:title (function () { const key = "m"; class A { [key]() { return 9; } } return new A().m(); })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const key = "m"; class A { [key]() { return 9; } } return new A().m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
