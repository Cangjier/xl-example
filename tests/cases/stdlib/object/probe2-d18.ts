// xl:title (function () { const o = {}; Object.defineProperties(o, { a: { value: 1, enumerable: true }, b: { get() { return 2; }, enumerable: true } }); return Object.keys(o).join(",") + o.a + o.b; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperties(o, { a: { value: 1, enumerable: true }, b: { get() { return 2; }, enumerable: true } }); return Object.keys(o).join(",") + o.a + o.b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
