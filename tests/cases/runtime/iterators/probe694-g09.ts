// xl:title (function () { function* g() { yield 1; } const [a, b] = g(); return String(a) + "," + String(b); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield 1; } const [a, b] = g(); return String(a) + "," + String(b); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
