// xl:title (function () { class A { static get s() { return 1; } } class B extends A { } return B.s; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static get s() { return 1; } } class B extends A { } return B.s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
