// xl:title (function () { class A { static of() { return new A(); } } return A.of() instanceof A; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static of() { return new A(); } } return A.of() instanceof A; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
