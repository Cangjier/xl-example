// xl:title (function () { class A { } class B extends A { static m() { return 1; } } return B.m(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { } class B extends A { static m() { return 1; } } return B.m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
