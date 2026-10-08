// xl:title (function () { const o = Object.freeze([1, 2]); return [Object.isFrozen(o), o.length].join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = Object.freeze([1, 2]); return [Object.isFrozen(o), o.length].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
