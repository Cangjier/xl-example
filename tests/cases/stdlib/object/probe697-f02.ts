// xl:title (function () { const o = Object.seal({ a: 1 }); return [Object.isSealed(o), Object.isFrozen(o)].join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.seal({ a: 1 }); return [Object.isSealed(o), Object.isFrozen(o)].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
