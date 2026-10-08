// xl:title (function () { const o = { ["__proto__"]: { z: 1 } }; return Object.getPrototypeOf(o) === Object.prototype; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { ["__proto__"]: { z: 1 } }; return Object.getPrototypeOf(o) === Object.prototype; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
