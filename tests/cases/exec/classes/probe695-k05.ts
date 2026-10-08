// xl:title (function () { class A { get v() { return 1; } } class B extends A { get v() { return super.v + 1; } } return new B().v; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { get v() { return 1; } } class B extends A { get v() { return super.v + 1; } } return new B().v; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
