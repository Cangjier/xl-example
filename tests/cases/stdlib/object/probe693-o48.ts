// xl:title (function () { const o = {}; Object.defineProperties(o, { a: { value: 1 }, b: { value: 2, enumerable: true } }); return Object.keys(o).join(",") + "|" + o.a; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperties(o, { a: { value: 1 }, b: { value: 2, enumerable: true } }); return Object.keys(o).join(",") + "|" + o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
