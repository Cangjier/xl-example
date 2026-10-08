// xl:title (function () { class A { #x = 1; has(o) { return #x in o; } } return new A().has(new A()); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { #x = 1; has(o) { return #x in o; } } return new A().has(new A()); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
