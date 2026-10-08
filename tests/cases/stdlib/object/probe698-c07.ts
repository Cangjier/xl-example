// xl:title (function () { const o = {}; Object.defineProperty(o, "a", { value: 1, enumerable: true }); Object.defineProperty(o, "a", { enumerable: false }); return Object.keys(o).length + "," + o.a; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "a", { value: 1, enumerable: true }); Object.defineProperty(o, "a", { enumerable: false }); return Object.keys(o).length + "," + o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
