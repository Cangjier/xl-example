// xl:title (function () { const o = { a: { b: { c: 7 } } }; return o.a["b"].c; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: { b: { c: 7 } } }; return o.a["b"].c; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
