// xl:title (function () { const o = {}; Object.defineProperty(o, "a", { value: 1, writable: true, enumerable: false, configurable: false }); return Object.keys(o).length; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "a", { value: 1, writable: true, enumerable: false, configurable: false }); return Object.keys(o).length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
