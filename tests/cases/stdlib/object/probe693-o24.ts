// xl:title (function () { const o = { a: 1 }; Object.seal(o); return Object.isSealed(o) + "," + Object.isFrozen(o); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; Object.seal(o); return Object.isSealed(o) + "," + Object.isFrozen(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
