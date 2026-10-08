// xl:title (function () { const it = [1, 2][Symbol.iterator](); return typeof it.next; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = [1, 2][Symbol.iterator](); return typeof it.next; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
