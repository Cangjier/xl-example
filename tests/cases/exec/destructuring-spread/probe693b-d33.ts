// xl:title (function () { let x = 1; const o = { x, y: 2 }; return o.x + o.y; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let x = 1; const o = { x, y: 2 }; return o.x + o.y; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
