// xl:title (function () { function* g() { yield 1; } const it = g(); it.next(); return typeof it.throw; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield 1; } const it = g(); it.next(); return typeof it.throw; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
