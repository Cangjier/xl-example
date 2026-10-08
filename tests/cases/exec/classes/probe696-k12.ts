// xl:title (function () { class A { async m() { return 1; } } return typeof new A().m().then; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { async m() { return 1; } } return typeof new A().m().then; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
