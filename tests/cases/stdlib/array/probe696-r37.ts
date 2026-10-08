// xl:title (function () { const o = { length: 2, 0: 1, 1: 2 }; return Array.prototype.reduce.call(o, (a, v, i, arr) => String(arr === o), ""); })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { length: 2, 0: 1, 1: 2 }; return Array.prototype.reduce.call(o, (a, v, i, arr) => String(arr === o), ""); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
