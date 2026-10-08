// xl:title (function () { const o = { length: 2, 0: 1, 1: 2 }; return Array.prototype.map.call(o, (v, i, arr) => arr === o).join(","); })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { length: 2, 0: 1, 1: 2 }; return Array.prototype.map.call(o, (v, i, arr) => arr === o).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
