// xl:title (function () { const it = [1, 2][Symbol.iterator](); return it.next().value; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = [1, 2][Symbol.iterator](); return it.next().value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
