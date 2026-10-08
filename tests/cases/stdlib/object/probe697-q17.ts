// xl:title (function () { const o = {}; o.__proto__ = null; return Object.getPrototypeOf(o); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; o.__proto__ = null; return Object.getPrototypeOf(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
