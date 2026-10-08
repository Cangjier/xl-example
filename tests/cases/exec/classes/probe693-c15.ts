// xl:title (function () { class A { m() { return 1; } } class B extends A { m() { return super.m() + 1; } } return new B().m(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { m() { return 1; } } class B extends A { m() { return super.m() + 1; } } return new B().m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
