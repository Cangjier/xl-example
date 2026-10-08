// xl:title (function () { const it = (function* () { yield 1; yield 2; })(); return it.next().value + it.next().value; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = (function* () { yield 1; yield 2; })(); return it.next().value + it.next().value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
