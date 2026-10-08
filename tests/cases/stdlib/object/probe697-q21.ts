// xl:title (function () { const p = { m() { return 7; } }; const o = {}; o.__proto__ = p; return o.m(); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = { m() { return 7; } }; const o = {}; o.__proto__ = p; return o.m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
