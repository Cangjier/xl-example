// xl:title (function () { const p = { get v() { return 5; } }; const o = Object.create(p); o.v = 3; return [o.v, o.hasOwnProperty("v")].join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = { get v() { return 5; } }; const o = Object.create(p); o.v = 3; return [o.v, o.hasOwnProperty("v")].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
