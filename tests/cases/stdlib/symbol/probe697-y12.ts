// xl:title (function () { const o = {}; const s = Symbol("k"); o[s] = 5; return Object.keys(o).length + "," + o[s]; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; const s = Symbol("k"); o[s] = 5; return Object.keys(o).length + "," + o[s]; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
