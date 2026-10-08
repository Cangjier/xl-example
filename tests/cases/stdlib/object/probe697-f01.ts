// xl:title (function () { const o = Object.freeze({ a: 1 }); return Object.isFrozen(o); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.freeze({ a: 1 }); return Object.isFrozen(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
