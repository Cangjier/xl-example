// xl:title (function () { class A { #x = 1; static has(o) { return #x in o; } } return A.has(new A()) + "," + A.has({}); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { #x = 1; static has(o) { return #x in o; } } return A.has(new A()) + "," + A.has({}); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
