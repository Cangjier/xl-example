// xl:title (function () { class A { static s() { return 7; } } class B extends A { static s() { return super.s() + 1; } } return B.s(); })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static s() { return 7; } } class B extends A { static s() { return super.s() + 1; } } return B.s(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
