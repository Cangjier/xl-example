// xl:title (function () { const o = { a: { b: { c: 5 } } }; return o["a"]?.b.c; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: { b: { c: 5 } } }; return o["a"]?.b.c; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
