// xl:title (function () { class A { constructor(a = 1) { this.a = a; } } return new A().a; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { constructor(a = 1) { this.a = a; } } return new A().a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
