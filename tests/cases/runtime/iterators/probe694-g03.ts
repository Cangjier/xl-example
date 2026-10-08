// xl:title (function () { function* g() { try { yield 1; } finally { } } const it = g(); it.next(); it.return(); return "ok"; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { try { yield 1; } finally { } } const it = g(); it.next(); it.return(); return "ok"; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
