// xl:title (function () { function* g() { try { yield 1; } finally { } } const it = g(); it.next(); return it.next().done; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { try { yield 1; } finally { } } const it = g(); it.next(); return it.next().done; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
