// xl:title (function () { const it = (function* () { yield 1; })(); return it.next().done + ':' + it.next().done; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = (function* () { yield 1; })(); return it.next().done + ':' + it.next().done; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
