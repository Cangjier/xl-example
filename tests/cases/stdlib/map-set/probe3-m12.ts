// xl:title (function () { const m = new Map([["a", 1]]); return Object.prototype.toString.call(m); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([["a", 1]]); return Object.prototype.toString.call(m); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
