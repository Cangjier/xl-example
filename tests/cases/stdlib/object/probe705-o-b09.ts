// xl:title Object.getPrototypeOf(function () {}) === Function.prototype
// xl:round 705
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getPrototypeOf(function () {}) === Function.prototype));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
