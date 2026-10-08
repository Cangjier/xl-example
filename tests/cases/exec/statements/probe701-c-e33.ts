// xl:title (function () { const g = function* () { yield 1; }; let n = 0; for (const v of g()) n += v; return n; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const g = function* () { yield 1; }; let n = 0; for (const v of g()) n += v; return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
