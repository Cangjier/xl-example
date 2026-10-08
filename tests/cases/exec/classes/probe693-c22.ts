// xl:title (function () { class A { x = 1; y = this.x + 1; } return new A().y; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { x = 1; y = this.x + 1; } return new A().y; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
