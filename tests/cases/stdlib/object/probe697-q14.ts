// xl:title (function () { const p = { g: 1 }; const o = {}; o.__proto__ = p; return o.g; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = { g: 1 }; const o = {}; o.__proto__ = p; return o.g; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
