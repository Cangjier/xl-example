// xl:title (function () { function* g() { const a = yield 1; return a; } const it = g(); it.next(); return it.next(9).value; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { const a = yield 1; return a; } const it = g(); it.next(); return it.next(9).value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
