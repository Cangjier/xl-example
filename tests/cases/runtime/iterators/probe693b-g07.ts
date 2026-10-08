// xl:title (function () { function* g() { yield 1; yield 2; } const it = g(); it.next(); return it.return(9).done; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield 1; yield 2; } const it = g(); it.next(); return it.return(9).done; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
