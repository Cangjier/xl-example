// xl:title (function () { const o = {}; Object.freeze(o); return Object.isFrozen(o) + "," + Object.isExtensible(o); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.freeze(o); return Object.isFrozen(o) + "," + Object.isExtensible(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
