// xl:title (function () { class A { get v() { return 1; } } class B extends A { m() { return super.v; } } return new B().m(); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { get v() { return 1; } } class B extends A { m() { return super.v; } } return new B().m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
