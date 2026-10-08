// xl:title (function () { const k = 1; const o = { [k + 1]: "x" }; return o[2]; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const k = 1; const o = { [k + 1]: "x" }; return o[2]; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
