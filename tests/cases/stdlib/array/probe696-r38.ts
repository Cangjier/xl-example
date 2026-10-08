// xl:title (function () { const o = { length: 1, 0: 1 }; return Array.prototype.filter.call(o, (v, i, arr) => arr === o).length; })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { length: 1, 0: 1 }; return Array.prototype.filter.call(o, (v, i, arr) => arr === o).length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
