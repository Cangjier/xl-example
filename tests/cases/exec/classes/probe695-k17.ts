// xl:title (function () { class A { get a() { return 1; } } return JSON.stringify(new A()); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { get a() { return 1; } } return JSON.stringify(new A()); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
