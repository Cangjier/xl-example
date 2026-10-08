// xl:title (function () { const f = ({ a, b } = { a: 1, b: 2 }) => a + b; return f(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = ({ a, b } = { a: 1, b: 2 }) => a + b; return f(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
