// xl:title (function () { function B() {} B.prototype.t = "b"; const o = {}; Object.setPrototypeOf(o, B.prototype); return [o.t, o instanceof B].join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function B() {} B.prototype.t = "b"; const o = {}; Object.setPrototypeOf(o, B.prototype); return [o.t, o instanceof B].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
