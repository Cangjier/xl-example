// xl:title (function () { const { a: { b } } = { a: { b: 2 } }; return b; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const { a: { b } } = { a: { b: 2 } }; return b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
