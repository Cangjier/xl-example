// xl:title (function () { class A { ["m" + 1]() { return 1; } } return new A().m1(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { ["m" + 1]() { return 1; } } return new A().m1(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
