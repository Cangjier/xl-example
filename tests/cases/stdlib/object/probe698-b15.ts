// xl:title (function () { const o = { valueOf: () => -0 }; return Object.is(o * 1, -0); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { valueOf: () => -0 }; return Object.is(o * 1, -0); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
