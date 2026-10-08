// xl:title (function () { const proto = { get x() { return 5; } }; const o = { __proto__: proto }; return o.x; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const proto = { get x() { return 5; } }; const o = { __proto__: proto }; return o.x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
