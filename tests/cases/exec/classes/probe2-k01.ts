// xl:title (function () { class A { static f() { return 1; } } class B extends A { static f() { return super.f() + 1; } } return B.f(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static f() { return 1; } } class B extends A { static f() { return super.f() + 1; } } return B.f(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
