// xl:title (function () { function* g() { const x = yield 1; return x; } const it = g(); it.next(); return it.next(5).value; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { const x = yield 1; return x; } const it = g(); it.next(); return it.next(5).value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
