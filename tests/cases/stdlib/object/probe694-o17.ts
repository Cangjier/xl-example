// xl:title (function () { const a = [1]; Object.freeze(a); return Object.isFrozen(a); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1]; Object.freeze(a); return Object.isFrozen(a); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
